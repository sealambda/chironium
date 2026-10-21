defmodule Chironium.Health.ObservationPolicyTest do
  @moduledoc """
  Policy and authorization tests for all Observation specialised create actions,
  specialised read actions, update, and destroy.

  Actor paths covered:
  - Power user (org owner) — bypass policy, always authorized.
  - Practitioner assigned via active CareTeam — authorized on writes (actor_present)
    and reads (PatientSubjectVisibleToActor).
  - Practitioner NOT in the relevant care team — authorized on writes but sees no
    observations belonging to other patients on reads.
  - Nil (unauthenticated) actor — denied on all write actions; reads return empty.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # Specialised create actions — power user
  # ---------------------------------------------------------------------------

  describe "specialised create actions — power user" do
    test "log_food_preference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_food_preference(ctx, ctx.owner, patient.id)
      assert obs.subject_id == patient.id
    end

    test "log_food_aversion", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_food_aversion(ctx, ctx.owner, patient.id)
      assert obs.subject_id == patient.id
    end

    test "log_body_weight", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      assert obs.value_quantity != nil
    end

    test "log_body_height", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_body_height(ctx, ctx.owner, patient.id, 175.0)
      assert obs.value_quantity != nil
    end

    test "log_chest_circumference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_chest_circumference(ctx, ctx.owner, patient.id, 90.0)
      assert obs.value_quantity != nil
    end

    test "log_hip_circumference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_hip_circumference(ctx, ctx.owner, patient.id, 95.0)
      assert obs.value_quantity != nil
    end

    test "log_waist_circumference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_waist_circumference(ctx, ctx.owner, patient.id, 80.0)
      assert obs.value_quantity != nil
    end

    test "log_arm_circumference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_arm_circumference(ctx, ctx.owner, patient.id, 30.0)
      assert obs.value_quantity != nil
    end

    test "log_thigh_circumference", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_thigh_circumference(ctx, ctx.owner, patient.id, 55.0)
      assert obs.value_quantity != nil
    end

    test "log_menstrual_period_start", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_menstrual_period_start(ctx, ctx.owner, patient.id)
      assert obs.value_date_time != nil
    end

    test "log_menstrual_period_duration", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_menstrual_period_duration(ctx, ctx.owner, patient.id, 5)
      assert obs.value_quantity != nil
    end

    test "log_menarche_age", ctx do
      patient = create_patient(ctx)
      assert {:ok, obs} = log_menarche_age(ctx, ctx.owner, patient.id, 13)
      assert obs.value_quantity != nil
    end
  end

  # ---------------------------------------------------------------------------
  # Specialised create actions — practitioner assigned via CareTeam
  # ---------------------------------------------------------------------------

  describe "specialised create actions — practitioner assigned via CareTeam" do
    setup ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      %{practitioner_actor: actor, patient: patient}
    end

    test "log_food_preference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, obs} = log_food_preference(ctx, actor, patient.id)
      assert obs.subject_id == patient.id
    end

    test "log_food_aversion", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, obs} = log_food_aversion(ctx, actor, patient.id)
      assert obs.subject_id == patient.id
    end

    test "log_body_weight", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, obs} = log_body_weight(ctx, actor, patient.id, 70.0)
      assert obs.value_quantity != nil
    end

    test "log_body_height", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, obs} = log_body_height(ctx, actor, patient.id, 168.0)
      assert obs.value_quantity != nil
    end

    test "log_chest_circumference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_chest_circumference(ctx, actor, patient.id, 88.0)
    end

    test "log_hip_circumference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_hip_circumference(ctx, actor, patient.id, 92.0)
    end

    test "log_waist_circumference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_waist_circumference(ctx, actor, patient.id, 78.0)
    end

    test "log_arm_circumference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_arm_circumference(ctx, actor, patient.id, 28.0)
    end

    test "log_thigh_circumference", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_thigh_circumference(ctx, actor, patient.id, 52.0)
    end

    test "log_menstrual_period_start", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, obs} = log_menstrual_period_start(ctx, actor, patient.id)
      assert obs.value_date_time != nil
    end

    test "log_menstrual_period_duration", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_menstrual_period_duration(ctx, actor, patient.id, 6)
    end

    test "log_menarche_age", %{practitioner_actor: actor, patient: patient} = ctx do
      assert {:ok, _obs} = log_menarche_age(ctx, actor, patient.id, 14)
    end
  end

  # ---------------------------------------------------------------------------
  # Specialised create actions — unauthenticated actor is denied
  # ---------------------------------------------------------------------------

  describe "specialised create actions — unauthenticated actor is denied" do
    test "log_body_weight denied for nil actor", ctx do
      patient = create_patient(ctx)
      assert {:error, %Ash.Error.Forbidden{}} = log_body_weight(ctx, nil, patient.id, 70.0)
    end

    test "log_food_preference denied for nil actor", ctx do
      patient = create_patient(ctx)
      assert {:error, %Ash.Error.Forbidden{}} = log_food_preference(ctx, nil, patient.id)
    end

    test "log_menstrual_period_start denied for nil actor", ctx do
      patient = create_patient(ctx)
      assert {:error, %Ash.Error.Forbidden{}} = log_menstrual_period_start(ctx, nil, patient.id)
    end
  end

  # ---------------------------------------------------------------------------
  # Specialised read actions — care-team visibility
  # ---------------------------------------------------------------------------

  describe "specialised read actions — care-team visibility" do
    setup ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      %{practitioner_actor: actor, patient: patient}
    end

    test "power user reads body weight observations", %{patient: patient} = ctx do
      {:ok, obs} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      results = read_action(ctx, ctx.owner, :read_body_weight)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads body weight observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      results = read_action(ctx, actor, :read_body_weight)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner NOT in care team sees no body weight observations", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)
      {:ok, _obs} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      assert read_action(ctx, actor_b, :read_body_weight) == []
    end

    test "nil actor sees no body weight observations", %{patient: patient} = ctx do
      {:ok, _obs} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      assert read_action(ctx, nil, :read_body_weight) == []
    end

    test "practitioner in care team reads body height observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_body_height(ctx, ctx.owner, patient.id, 170.0)
      results = read_action(ctx, actor, :read_body_height)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads food preference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_food_preference(ctx, ctx.owner, patient.id)
      results = read_action(ctx, actor, :read_food_preference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads food aversion observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_food_aversion(ctx, ctx.owner, patient.id)
      results = read_action(ctx, actor, :read_food_aversion)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads chest circumference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_chest_circumference(ctx, ctx.owner, patient.id, 90.0)
      results = read_action(ctx, actor, :read_chest_circumference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads hip circumference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_hip_circumference(ctx, ctx.owner, patient.id, 95.0)
      results = read_action(ctx, actor, :read_hip_circumference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads waist circumference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_waist_circumference(ctx, ctx.owner, patient.id, 80.0)
      results = read_action(ctx, actor, :read_waist_circumference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads arm circumference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_arm_circumference(ctx, ctx.owner, patient.id, 30.0)
      results = read_action(ctx, actor, :read_arm_circumference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads thigh circumference observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_thigh_circumference(ctx, ctx.owner, patient.id, 55.0)
      results = read_action(ctx, actor, :read_thigh_circumference)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads menstrual period start observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_menstrual_period_start(ctx, ctx.owner, patient.id)
      results = read_action(ctx, actor, :read_menstrual_period_start)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads menstrual period duration observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_menstrual_period_duration(ctx, ctx.owner, patient.id, 5)
      results = read_action(ctx, actor, :read_menstrual_period_duration)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner in care team reads menarche age observations",
         %{practitioner_actor: actor, patient: patient} = ctx do
      {:ok, obs} = log_menarche_age(ctx, ctx.owner, patient.id, 13)
      results = read_action(ctx, actor, :read_menarche_age)
      assert Enum.any?(results, &(&1.id == obs.id))
    end
  end

  # ---------------------------------------------------------------------------
  # BMI auto-computation
  # ---------------------------------------------------------------------------

  describe "BMI auto-computation" do
    test "logging weight then height auto-creates a BMI observation readable by power user",
         ctx do
      patient = create_patient(ctx)
      {:ok, _} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      {:ok, _} = log_body_height(ctx, ctx.owner, patient.id, 175.0)

      results = read_action(ctx, ctx.owner, :read_bmi)
      assert length(results) >= 1
    end

    test "practitioner in care team can read auto-computed BMI observations", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      {:ok, _} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      {:ok, _} = log_body_height(ctx, ctx.owner, patient.id, 175.0)

      results = read_action(ctx, actor, :read_bmi)
      assert length(results) >= 1
    end

    test "practitioner NOT in care team sees no BMI observations", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)
      {:ok, _} = log_body_weight(ctx, ctx.owner, patient.id, 75.0)
      {:ok, _} = log_body_height(ctx, ctx.owner, patient.id, 175.0)

      assert read_action(ctx, actor_b, :read_bmi) == []
    end
  end

  # ---------------------------------------------------------------------------
  # Waist/hip ratio auto-computation
  # ---------------------------------------------------------------------------

  describe "waist/hip ratio auto-computation" do
    test "logging hip then waist circumference auto-creates a ratio observation readable by power user",
         ctx do
      patient = create_patient(ctx)
      {:ok, _} = log_hip_circumference(ctx, ctx.owner, patient.id, 95.0)
      {:ok, _} = log_waist_circumference(ctx, ctx.owner, patient.id, 80.0)

      results = read_action(ctx, ctx.owner, :read_waist_hip_ratio)
      assert length(results) >= 1
    end

    test "practitioner in care team can read auto-computed waist/hip ratio observations", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      {:ok, _} = log_hip_circumference(ctx, ctx.owner, patient.id, 95.0)
      {:ok, _} = log_waist_circumference(ctx, ctx.owner, patient.id, 80.0)

      results = read_action(ctx, actor, :read_waist_hip_ratio)
      assert length(results) >= 1
    end

    test "practitioner NOT in care team sees no waist/hip ratio observations", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)
      {:ok, _} = log_hip_circumference(ctx, ctx.owner, patient.id, 95.0)
      {:ok, _} = log_waist_circumference(ctx, ctx.owner, patient.id, 80.0)

      assert read_action(ctx, actor_b, :read_waist_hip_ratio) == []
    end
  end

  # ---------------------------------------------------------------------------
  # Update
  # ---------------------------------------------------------------------------

  describe "update" do
    test "power user can update an observation", ctx do
      patient = create_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert {:ok, updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{value_string: "Updated"},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert updated.value_string == "Updated"
    end

    test "practitioner actor can update an observation", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert {:ok, _updated} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{value_string: "Updated by practitioner"},
                 actor: actor,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end

    test "nil actor is denied update", ctx do
      patient = create_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert {:error, %Ash.Error.Forbidden{}} =
               obs
               |> Ash.Changeset.for_update(
                 :update,
                 %{value_string: "Updated"},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # Destroy
  # ---------------------------------------------------------------------------

  describe "destroy" do
    test "power user can destroy an observation", ctx do
      patient = create_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert :ok =
               obs
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: ctx.owner, tenant: ctx.tenant)
               |> Ash.destroy()
    end

    test "practitioner actor can destroy an observation", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert :ok =
               obs
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: actor, tenant: ctx.tenant)
               |> Ash.destroy()
    end

    test "nil actor is denied destroy", ctx do
      patient = create_patient(ctx)
      obs = create_observation_bypass(ctx, patient.id)

      assert {:error, %Ash.Error.Forbidden{}} =
               obs
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: nil, tenant: ctx.tenant)
               |> Ash.destroy()
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  # Creates a practitioner user with an active PrincipalGrant and an active CareTeam
  # for a new patient. Returns {practitioner_actor, patient}.
  defp setup_practitioner_with_patient(ctx) do
    prac_user = generate(user())
    create_membership(ctx.organization.id, prac_user.id, :member)

    practitioner = create_practitioner(ctx)
    grant_practitioner(ctx, prac_user.id, practitioner.id)

    patient = create_patient(ctx)
    care_team = create_care_team(ctx, patient, :active)
    add_participant(ctx, care_team, practitioner)

    actor = enrich_actor(prac_user, ctx.tenant)
    {actor, patient}
  end

  defp create_membership(organization_id, user_id, role) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: organization_id, user_id: user_id, role: role},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_practitioner(ctx) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: "Dr. Test"}]},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: ctx.tenant)
    |> Ash.create!()
  end

  defp create_care_team(ctx, patient, status) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: status, name: "Test Team", subject_patient_id: patient.id},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp add_participant(ctx, care_team, practitioner) do
    Chironium.Health.CareTeamParticipant
    |> Ash.Changeset.for_create(
      :create,
      %{care_team_id: care_team.id, practitioner_id: practitioner.id, active: true},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp grant_practitioner(ctx, user_id, practitioner_id) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: user_id,
        principal_type: :practitioner,
        principal_id: practitioner_id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant, principal_types: [:practitioner])
  end

  # Creates an observation bypassing authorization — used to set up update/destroy tests.
  defp create_observation_bypass(ctx, patient_id) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient_id, value_string: "Test observation"},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  # Executes a paginated specialised read action and returns the result list.
  defp read_action(ctx, actor, action_name) do
    Chironium.Health.Observation
    |> Ash.Query.for_read(action_name)
    |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
    |> Map.get(:results)
  end

  # Specialised create helpers

  defp log_food_preference(ctx, actor, patient_id) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_food_preference,
      %{subject_id: patient_id, value_string: "Apples"},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_food_aversion(ctx, actor, patient_id) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_food_aversion,
      %{subject_id: patient_id, value_string: "Peanuts"},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_body_weight(ctx, actor, patient_id, weight_kg) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_body_weight,
      %{subject_id: patient_id, weight_kg: weight_kg},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_body_height(ctx, actor, patient_id, height_cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_body_height,
      %{subject_id: patient_id, height_cm: height_cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_chest_circumference(ctx, actor, patient_id, cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_chest_circumference,
      %{subject_id: patient_id, chest_circumference_cm: cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_hip_circumference(ctx, actor, patient_id, cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_hip_circumference,
      %{subject_id: patient_id, hip_circumference_cm: cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_waist_circumference(ctx, actor, patient_id, cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_waist_circumference,
      %{subject_id: patient_id, waist_circumference_cm: cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_arm_circumference(ctx, actor, patient_id, cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_arm_circumference,
      %{subject_id: patient_id, arm_circumference_cm: cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_thigh_circumference(ctx, actor, patient_id, cm) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_thigh_circumference,
      %{subject_id: patient_id, thigh_circumference_cm: cm},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_menstrual_period_start(ctx, actor, patient_id) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_menstrual_period_start,
      %{subject_id: patient_id, effective_date_time: DateTime.utc_now()},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_menstrual_period_duration(ctx, actor, patient_id, days) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_menstrual_period_duration,
      %{subject_id: patient_id, duration_days: days},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  defp log_menarche_age(ctx, actor, patient_id, years) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :log_menarche_age,
      %{subject_id: patient_id, age_years: years},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end
end
