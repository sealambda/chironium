defmodule Chironium.Health.Observation.Changes.RecomputeDerived do
  @moduledoc """
  Keeps BMI and waist/hip ratio in sync with their inputs.

  The app shows one anthropometry entry per day in the organization's timezone, so derived
  values follow the same rule:
  whenever a weight, height, waist or hip observation is created or updated, the derived
  observation for that day is recomputed from the latest value of each input up to the end
  of the day, and stamped with the day's latest input time. It exists only while some input
  falls on that day, so moving an entry to another date moves its derived value with it.

  It runs after the transaction so that when two inputs are saved in parallel (e.g. weight
  and height from the same form), the request that commits last sees both. A per-subject
  advisory lock serializes the upsert, so parallel saves leave a single derived observation.
  """

  use Ash.Resource.Change

  require Ash.Query
  require Logger

  alias Chironium.Accounts.Authorization
  alias Chironium.Accounts.Organization
  alias Chironium.Health.Observation
  alias Chironium.Repo

  # Codes mirror the constants in `Chironium.Health.Observation`.
  @loinc "http://loinc.org"
  @snomed "http://snomed.info/sct"
  @ucum "http://unitsofmeasure.org"

  @derived [
    %{
      name: "BMI",
      inputs: [
        {@loinc, "29463-7", :read_body_weight},
        {@loinc, "8302-2", :read_body_height}
      ],
      code: %{system: @loinc, code: "39156-5"},
      read: :read_bmi,
      unit: "kg/m2",
      compute: &__MODULE__.bmi/2
    },
    %{
      name: "Waist/hip ratio",
      inputs: [
        {@loinc, "8280-0", :read_waist_circumference},
        {@loinc, "56063-1", :read_hip_circumference}
      ],
      code: %{system: @snomed, code: "248367009"},
      read: :read_waist_hip_ratio,
      unit: "1",
      compute: &__MODULE__.waist_hip_ratio/2
    }
  ]

  @doc false
  def bmi(weight_kg, height_cm) do
    height_m = Decimal.div(height_cm, 100)
    weight_kg |> Decimal.div(Decimal.mult(height_m, height_m)) |> Decimal.round(1)
  end

  @doc false
  def waist_hip_ratio(waist_cm, hip_cm), do: waist_cm |> Decimal.div(hip_cm) |> Decimal.round(2)

  @impl Ash.Resource.Change
  def change(changeset, _opts, _context) do
    changeset
    # Inside a surrounding transaction (e.g. questionnaire extraction) the hook shares its
    # connection, so it still sees the inputs and is safe to run there.
    |> Ash.Changeset.set_context(%{warn_on_transaction_hooks?: false})
    |> Ash.Changeset.after_transaction(fn
      changeset, {:ok, observation} ->
        specs = specs_for(observation)

        if specs != [] do
          time_zone = organization_time_zone(changeset.tenant)

          # An edit that moves the date must also clear the derived value on the old day.
          days =
            [observation.effective_date_time, changeset.data.effective_date_time]
            |> Enum.filter(&match?(%DateTime{}, &1))
            |> Enum.map(&(&1 |> DateTime.shift_zone!(time_zone) |> DateTime.to_date()))
            |> Enum.uniq()

          for spec <- specs, day <- days do
            recompute(spec, observation.subject_id, day, time_zone, changeset.tenant)
          end
        end

        {:ok, observation}

      _changeset, error ->
        error
    end)
  end

  # Only adds a hook, so the update itself can still run atomically.
  @impl Ash.Resource.Change
  def atomic(changeset, opts, context), do: {:ok, change(changeset, opts, context)}

  defp specs_for(%{code: %{coding: [_ | _] = codings}}) do
    Enum.filter(@derived, fn spec ->
      Enum.any?(spec.inputs, fn {system, code, _read} ->
        Enum.any?(codings, &(&1.system == system and &1.code == code))
      end)
    end)
  end

  defp specs_for(_observation), do: []

  defp organization_time_zone(tenant) do
    with {:ok, organization_id} <- Authorization.organization_id_from_tenant(tenant),
         {:ok, organization} <- Ash.get(Organization, organization_id, authorize?: false) do
      organization.timezone
    else
      _ -> "Etc/UTC"
    end
  end

  # The first instant of `day` in `time_zone`, in UTC; DST can skip or repeat midnight.
  defp start_of_day(day, time_zone) do
    case DateTime.new(day, ~T[00:00:00], time_zone) do
      {:ok, start} -> start
      {:gap, _before, start} -> start
      {:ambiguous, start, _later} -> start
    end
    |> DateTime.shift_zone!("Etc/UTC")
  end

  defp recompute(spec, subject_id, day, time_zone, tenant) do
    opts = [tenant: tenant, authorize?: false]
    day_start = start_of_day(day, time_zone)
    day_end = start_of_day(Date.add(day, 1), time_zone)

    Repo.transaction(fn ->
      Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "#{subject_id}:#{spec.code.code}"
      ])

      inputs =
        Enum.map(spec.inputs, fn {_, _, read} -> latest(read, subject_id, day_end, opts) end)

      [kept | duplicates] =
        Observation
        |> Ash.Query.for_read(spec.read)
        |> Ash.Query.filter(
          subject_id == ^subject_id and effective_date_time >= ^day_start and
            effective_date_time < ^day_end
        )
        |> Ash.Query.sort(id: :asc)
        |> Ash.read!(Keyword.put(opts, :page, limit: 100))
        |> Map.get(:results)
        |> case do
          [] -> [nil]
          existing -> existing
        end

      # Earlier saves could leave more than one per day; keep a single one.
      Enum.each(duplicates, &Ash.destroy!(&1, opts))

      on_day =
        Enum.filter(inputs, &(&1 && DateTime.compare(&1.effective_date_time, day_start) != :lt))

      cond do
        on_day != [] and Enum.all?(inputs) ->
          [a, b] = Enum.map(inputs, & &1.value_quantity.value)
          at = on_day |> Enum.map(& &1.effective_date_time) |> Enum.max(DateTime)
          quantity = %{system: @ucum, code: spec.unit, value: spec.compute.(a, b)}
          upsert(kept, spec, subject_id, at, quantity, opts)

        kept ->
          Ash.destroy!(kept, opts)

        true ->
          :ok
      end
    end)
  rescue
    error ->
      Logger.warning(
        "[Observation] #{spec.name} recomputation failed for subject #{subject_id}: " <>
          Exception.message(error)
      )
  end

  defp latest(read, subject_id, before, opts) do
    Observation
    |> Ash.Query.for_read(read)
    |> Ash.Query.filter(subject_id == ^subject_id and effective_date_time < ^before)
    |> Ash.Query.sort(effective_date_time: :desc, id: :desc)
    |> Ash.read!(Keyword.put(opts, :page, limit: 1))
    |> Map.get(:results)
    |> List.first()
  end

  defp upsert(nil, spec, subject_id, at, quantity, opts) do
    Observation
    |> Ash.Changeset.for_create(
      :create,
      %{
        subject_id: subject_id,
        code: %{coding: [spec.code]},
        value_quantity: quantity,
        effective_date_time: at
      },
      opts
    )
    |> Ash.create!()
  end

  defp upsert(existing, _spec, _subject_id, at, quantity, opts) do
    existing
    |> Ash.Changeset.for_update(
      :update,
      %{value_quantity: quantity, effective_date_time: at},
      opts
    )
    |> Ash.update!()
  end
end
