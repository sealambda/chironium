defmodule Chironium.Health.MenstrualCycleUpdateTest do
  @moduledoc """
  Tests for the `update_menstrual_period_start` and `update_menstrual_period_duration` actions.

  The key invariants verified here are:
  - `update_menstrual_period_start` keeps `value_date_time` in sync with
    `effective_date_time` when the date changes.
  - `update_menstrual_period_duration` preserves the UCUM coding on
    `value_quantity` (system + code) rather than just overwriting the value.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  @unit_of_measure_system "http://unitsofmeasure.org"
  @unit_of_measure_code_day "d"

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # update_menstrual_period_start
  # ---------------------------------------------------------------------------

  describe "update_menstrual_period_start" do
    test "mirrors updated effective_date_time to value_date_time", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])

      assert obs.value_date_time == ~U[2025-04-01 00:00:00Z]

      {:ok, updated} =
        obs
        |> Ash.Changeset.for_update(
          :update_menstrual_period_start,
          %{effective_date_time: ~U[2025-05-05 00:00:00Z]},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      assert updated.effective_date_time == ~U[2025-05-05 00:00:00Z]
      assert updated.value_date_time == ~U[2025-05-05 00:00:00Z]
    end

    test "does not change value_date_time when effective_date_time is not updated", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-04-01 00:00:00Z])

      assert obs.value_date_time == ~U[2025-04-01 00:00:00Z]

      note_text = "Mild cramps, normal flow."

      {:ok, updated} =
        obs
        |> Ash.Changeset.for_update(
          :update_menstrual_period_start,
          %{note: [%{text: note_text, author_string: "Dr. Test", time: DateTime.utc_now()}]},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      # Dates unchanged.
      assert updated.effective_date_time == obs.effective_date_time
      assert updated.value_date_time == ~U[2025-04-01 00:00:00Z]

      assert hd(updated.note).text == note_text
    end

    test "power user can update the start observation", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-03-10 00:00:00Z])

      assert {:ok, _updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update_menstrual_period_start,
                 %{effective_date_time: ~U[2025-03-11 00:00:00Z]},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end

    test "nil actor is denied", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_start(ctx, ctx.owner, patient.id, ~U[2025-03-10 00:00:00Z])

      assert {:error, %Ash.Error.Forbidden{}} =
               obs
               |> Ash.Changeset.for_update(
                 :update_menstrual_period_start,
                 %{effective_date_time: ~U[2025-03-11 00:00:00Z]},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # update_menstrual_period_duration
  # ---------------------------------------------------------------------------

  describe "update_menstrual_period_duration" do
    test "updates duration value while preserving UCUM system and code", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 5)

      assert Decimal.equal?(obs.value_quantity.value, Decimal.new(5))
      assert obs.value_quantity.system == @unit_of_measure_system
      assert obs.value_quantity.code == @unit_of_measure_code_day

      {:ok, updated} =
        obs
        |> Ash.Changeset.for_update(
          :update_menstrual_period_duration,
          %{duration_days: 7},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      assert Decimal.equal?(updated.value_quantity.value, Decimal.new(7))
      assert updated.value_quantity.system == @unit_of_measure_system
      assert updated.value_quantity.code == @unit_of_measure_code_day
    end

    test "updates effective_date_time alongside duration", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 5)

      {:ok, updated} =
        obs
        |> Ash.Changeset.for_update(
          :update_menstrual_period_duration,
          %{duration_days: 6, effective_date_time: ~U[2025-06-01 00:00:00Z]},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      assert Decimal.equal?(updated.value_quantity.value, Decimal.new(6))
      assert updated.effective_date_time == ~U[2025-06-01 00:00:00Z]
    end

    test "power user can update the duration observation", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 4)

      assert {:ok, _updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update_menstrual_period_duration,
                 %{duration_days: 6},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end

    test "nil actor is denied", ctx do
      patient = create_patient(ctx)
      {:ok, obs} = log_period_duration(ctx, ctx.owner, patient.id, 4)

      assert {:error, %Ash.Error.Forbidden{}} =
               obs
               |> Ash.Changeset.for_update(
                 :update_menstrual_period_duration,
                 %{duration_days: 6},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # Legacy-observation migration
  # ---------------------------------------------------------------------------

  describe "legacy observation migration" do
    test "update_menstrual_period_start migrates value_string to value_date_time", ctx do
      patient = create_patient(ctx)
      {:ok, legacy} = create_legacy_observation(ctx, patient.id, "start:2025-02-10")

      assert legacy.value_string == "start:2025-02-10"
      assert is_nil(legacy.value_date_time)

      {:ok, updated} =
        legacy
        |> Ash.Changeset.for_update(
          :update_menstrual_period_start,
          %{effective_date_time: ~U[2025-02-10 00:00:00Z]},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      assert updated.value_date_time == ~U[2025-02-10 00:00:00Z]
      assert is_nil(updated.value_string)
      assert is_nil(updated.value_quantity)
      assert is_nil(updated.value_codeable_concept)
      # The LOINC code must be set so the observation is discoverable as MENSTRUAL_PERIOD_START.
      assert hd(updated.code.coding).code == "8665-2"
    end

    test "update_menstrual_period_duration migrates value_string to value_quantity", ctx do
      patient = create_patient(ctx)
      {:ok, legacy} = create_legacy_observation(ctx, patient.id, "5")

      assert legacy.value_string == "5"

      {:ok, updated} =
        legacy
        |> Ash.Changeset.for_update(
          :update_menstrual_period_duration,
          %{duration_days: 7},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.update()

      assert Decimal.equal?(updated.value_quantity.value, Decimal.new(7))
      assert updated.value_quantity.system == @unit_of_measure_system
      assert updated.value_quantity.code == @unit_of_measure_code_day
      assert is_nil(updated.value_string)
      assert is_nil(updated.value_date_time)
      assert is_nil(updated.value_codeable_concept)
      # The LOINC code must be set so the observation is discoverable as MENSTRUAL_PERIOD_DURATION.
      assert hd(updated.code.coding).code == "3144-3"
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

  # Creates a legacy-style observation with value_string set, bypassing
  # authorization so the test is not dependent on a specific policy role.
  defp create_legacy_observation(ctx, patient_id, value_string) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient_id, value_string: value_string},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end
end
