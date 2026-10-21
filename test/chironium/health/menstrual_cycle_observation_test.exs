defmodule Chironium.Health.MenstrualCycleObservationTest do
  @moduledoc """
  Data-invariant tests for menstrual-cycle create actions and subsequent generic
  updates.

  Covered:
  - `log_menstrual_period_start` mirrors `effective_date_time` to `value_date_time`.
  - `log_menstrual_period_duration` stores the correct UCUM system and code on
    `value_quantity`.
  - The generic `:update` action allows editing notes, effective date, and value.
  - Authorization: authenticated actor may write; nil actor is denied.

  Read-path and broader authorization coverage live in
  `ObservationPolicyTest`.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  @loinc_system "http://loinc.org"
  @loinc_code_period_start "8665-2"
  @loinc_code_period_duration "3144-3"
  @ucum_system "http://unitsofmeasure.org"
  @ucum_code_day "d"

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # log_menstrual_period_start
  # ---------------------------------------------------------------------------

  describe "log_menstrual_period_start" do
    test "mirrors effective_date_time to value_date_time", ctx do
      patient = create_patient(ctx)
      effective = ~U[2025-04-01 00:00:00Z]

      assert {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, effective)

      assert obs.value_date_time == effective
      assert obs.effective_date_time == effective
    end

    test "sets the LOINC code for menstrual period start", ctx do
      patient = create_patient(ctx)

      assert {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])

      assert [coding] = obs.code.coding
      assert coding.system == @loinc_system
      assert coding.code == @loinc_code_period_start
    end

    test "nil actor is denied", ctx do
      patient = create_patient(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               log_period_start(ctx, nil, patient.id, ~U[2025-04-01 00:00:00Z])
    end
  end

  # ---------------------------------------------------------------------------
  # log_menstrual_period_duration
  # ---------------------------------------------------------------------------

  describe "log_menstrual_period_duration" do
    test "stores value_quantity with UCUM day coding", ctx do
      patient = create_patient(ctx)

      assert {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 5)

      assert Decimal.equal?(obs.value_quantity.value, Decimal.new(5))
      assert obs.value_quantity.system == @ucum_system
      assert obs.value_quantity.code == @ucum_code_day
    end

    test "sets the LOINC code for menstrual period duration", ctx do
      patient = create_patient(ctx)

      assert {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 5)

      assert [coding] = obs.code.coding
      assert coding.system == @loinc_system
      assert coding.code == @loinc_code_period_duration
    end

    test "duration_days must be non-negative", ctx do
      patient = create_patient(ctx)

      assert {:error, %Ash.Error.Invalid{}} =
               Chironium.Health.Observation
               |> Ash.Changeset.for_create(
                 :log_menstrual_period_duration,
                 %{subject_id: patient.id, duration_days: -1},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "nil actor is denied", ctx do
      patient = create_patient(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               log_period_duration(ctx, nil, patient.id, 5)
    end
  end

  # ---------------------------------------------------------------------------
  # Generic :update after creation
  # ---------------------------------------------------------------------------

  describe "updating a period-start observation via :update" do
    test "updates effective_date_time (value_date_time is not automatically re-synced)", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])

      assert {:ok, updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{effective_date_time: ~U[2025-05-05 00:00:00Z]},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert updated.effective_date_time == ~U[2025-05-05 00:00:00Z]
      # value_date_time is set on create only; generic update does not re-sync.
      assert updated.value_date_time == ~U[2025-04-01 00:00:00Z]
    end

    test "appends a note", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])
      note_text = "Mild cramps, normal flow."

      assert {:ok, updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{
                   note: [%{text: note_text, author_string: "Dr. Test", time: DateTime.utc_now()}]
                 },
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert hd(updated.note).text == note_text
    end

    test "nil actor is denied", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])

      assert {:error, %Ash.Error.Forbidden{}} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{effective_date_time: ~U[2025-05-05 00:00:00Z]},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  describe "updating a period-duration observation via :update" do
    test "can change the duration value", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 5)

      assert {:ok, updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{value_quantity: %{value: 7, system: @ucum_system, code: @ucum_code_day}},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert Decimal.equal?(updated.value_quantity.value, Decimal.new(7))
      assert updated.value_quantity.system == @ucum_system
      assert updated.value_quantity.code == @ucum_code_day
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: ctx.tenant)
    |> Ash.create!()
  end

  defp log_period_start(ctx, actor, patient_id, effective_date_time) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_menstrual_period_start,
      %{subject_id: patient_id, effective_date_time: effective_date_time},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_period_duration(ctx, actor, patient_id, duration_days) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_menstrual_period_duration,
      %{subject_id: patient_id, duration_days: duration_days},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end
end
