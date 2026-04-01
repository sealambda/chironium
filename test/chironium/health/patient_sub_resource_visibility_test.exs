defmodule Chironium.Health.PatientSubResourceVisibilityTest do
  @moduledoc """
  Verifies that Observation, Condition, Goal, AllergyIntolerance, MedicationStatement,
  NutritionPlan, and Task are scoped to the actor's care-team patients.
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
  # Observation
  # ---------------------------------------------------------------------------

  describe "Observation visibility" do
    test "practitioner in care team can read patient's observations", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)

      obs = create_observation(ctx, patient)

      results = Chironium.Health.Observation |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "practitioner NOT in care team cannot read observations", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _obs = create_observation(ctx, patient)

      results = Chironium.Health.Observation |> Ash.read!(actor: actor_b, tenant: ctx.tenant)
      assert results == []
    end

    test "power user sees all observations", ctx do
      {_actor, patient} = setup_practitioner_with_patient(ctx)
      obs = create_observation(ctx, patient)

      results = Chironium.Health.Observation |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == obs.id))
    end

    test "unauthenticated actor sees no observations", ctx do
      {_actor, patient} = setup_practitioner_with_patient(ctx)
      _obs = create_observation(ctx, patient)

      results =
        Chironium.Health.Observation |> Ash.read!(actor: nil, tenant: ctx.tenant)

      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # Condition
  # ---------------------------------------------------------------------------

  describe "Condition visibility" do
    test "practitioner in care team can read patient's conditions", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      condition = create_condition(ctx, patient)

      results = Chironium.Health.Condition |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == condition.id))
    end

    test "practitioner NOT in care team cannot read conditions", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _condition = create_condition(ctx, patient)

      results = Chironium.Health.Condition |> Ash.read!(actor: actor_b, tenant: ctx.tenant)
      assert results == []
    end

    test "power user sees all conditions", ctx do
      {_actor, patient} = setup_practitioner_with_patient(ctx)
      condition = create_condition(ctx, patient)

      results = Chironium.Health.Condition |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == condition.id))
    end
  end

  # ---------------------------------------------------------------------------
  # Goal
  # ---------------------------------------------------------------------------

  describe "Goal visibility" do
    test "practitioner in care team can read patient's goals", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      goal = create_goal(ctx, patient)

      results = Chironium.Health.Goal |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == goal.id))
    end

    test "practitioner NOT in care team cannot read goals", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _goal = create_goal(ctx, patient)

      results = Chironium.Health.Goal |> Ash.read!(actor: actor_b, tenant: ctx.tenant)
      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # AllergyIntolerance
  # ---------------------------------------------------------------------------

  describe "AllergyIntolerance visibility" do
    test "practitioner in care team can read patient's allergies", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      allergy = create_allergy_intolerance(ctx, patient)

      results =
        Chironium.Health.AllergyIntolerance |> Ash.read!(actor: actor, tenant: ctx.tenant)

      assert Enum.any?(results, &(&1.id == allergy.id))
    end

    test "practitioner NOT in care team cannot read allergies", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _allergy = create_allergy_intolerance(ctx, patient)

      results =
        Chironium.Health.AllergyIntolerance |> Ash.read!(actor: actor_b, tenant: ctx.tenant)

      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # MedicationStatement
  # ---------------------------------------------------------------------------

  describe "MedicationStatement visibility" do
    test "practitioner in care team can read patient's medication statements", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      med = create_medication_statement(ctx, patient)

      results =
        Chironium.Health.MedicationStatement |> Ash.read!(actor: actor, tenant: ctx.tenant)

      assert Enum.any?(results, &(&1.id == med.id))
    end

    test "practitioner NOT in care team cannot read medication statements", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _med = create_medication_statement(ctx, patient)

      results =
        Chironium.Health.MedicationStatement |> Ash.read!(actor: actor_b, tenant: ctx.tenant)

      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # NutritionPlan
  # ---------------------------------------------------------------------------

  describe "NutritionPlan visibility" do
    test "practitioner in care team can read patient's nutrition plans", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      plan = create_nutrition_plan(ctx, patient)

      results = Chironium.Health.NutritionPlan |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == plan.id))
    end

    test "practitioner NOT in care team cannot read nutrition plans", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _plan = create_nutrition_plan(ctx, patient)

      results = Chironium.Health.NutritionPlan |> Ash.read!(actor: actor_b, tenant: ctx.tenant)
      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # Task
  # ---------------------------------------------------------------------------

  describe "Task visibility" do
    test "practitioner in care team can read tasks for their patient", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient)

      results = Chironium.Health.Task |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == task.id))
    end

    test "practitioner NOT in care team cannot read tasks for another patient", ctx do
      {_actor_a, patient} = setup_practitioner_with_patient(ctx)
      {actor_b, _other_patient} = setup_practitioner_with_patient(ctx)

      _task = create_task(ctx, patient)

      results = Chironium.Health.Task |> Ash.read!(actor: actor_b, tenant: ctx.tenant)
      assert results == []
    end

    test "tasks without a patient are invisible to non-power-user actors", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      _task = create_task_without_patient(ctx)

      # Member has no grants → actor is still %User{} → not a Practitioner → filter returns false.
      results = Chironium.Health.Task |> Ash.read!(actor: member, tenant: ctx.tenant)
      assert results == []
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  # Creates a practitioner user with a grant and an active care team patient.
  # Returns {practitioner_actor, patient}.
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

  defp create_observation(ctx, patient) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient.id, value_string: "test"},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_condition(ctx, patient) do
    Chironium.Health.Condition
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient.id},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_goal(ctx, patient) do
    Chironium.Health.Goal
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient.id, lifecycle_status: :proposed, description: %{text: "Test goal"}},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_allergy_intolerance(ctx, patient) do
    Chironium.Health.AllergyIntolerance
    |> Ash.Changeset.for_create(
      :create,
      %{patient_id: patient.id},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_medication_statement(ctx, patient) do
    Chironium.Health.MedicationStatement
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient.id},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_nutrition_plan(ctx, patient) do
    Chironium.Health.NutritionPlan
    |> Ash.Changeset.for_create(
      :create,
      %{patient_id: patient.id, target_kcal: 2000, protein_g: 50, carbs_g: 200, fat_g: 70},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_task(ctx, patient) do
    Chironium.Health.Task
    |> Ash.Changeset.for_create(
      :create,
      %{for_patient_id: patient.id, intent: :order},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_task_without_patient(ctx) do
    Chironium.Health.Task
    |> Ash.Changeset.for_create(:create, %{intent: :order}, authorize?: false, tenant: ctx.tenant)
    |> Ash.create!()
  end

  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant)
  end
end
