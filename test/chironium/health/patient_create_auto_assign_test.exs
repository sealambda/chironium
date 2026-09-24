defmodule Chironium.Health.PatientCreateAutoAssignTest do
  @moduledoc """
  Tests that a Practitioner actor who creates a Patient is automatically
  enrolled in an active CareTeam for that patient, so they can immediately
  read the patient they just created.

  Power users (org owner / power_user role) are unaffected: they see all
  patients by default and no CareTeam is created on their behalf.
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
  # Practitioner actor
  # ---------------------------------------------------------------------------

  describe "practitioner actor creates patient" do
    test "patient is immediately visible to the creating practitioner", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)
      practitioner = create_practitioner(ctx)
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)
      actor = enrich_actor(practitioner_user, ctx.tenant)

      {:ok, patient} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: actor, tenant: ctx.tenant)
        |> Ash.create()

      visible_ids =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)

      assert patient.id in visible_ids
    end

    test "an active CareTeam is created with the practitioner as participant", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)
      practitioner = create_practitioner(ctx)
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)
      actor = enrich_actor(practitioner_user, ctx.tenant)

      {:ok, patient} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: actor, tenant: ctx.tenant)
        |> Ash.create()

      care_teams =
        Chironium.Health.CareTeam
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
        |> Enum.filter(&(&1.subject_patient_id == patient.id))

      assert length(care_teams) == 1
      [care_team] = care_teams
      assert care_team.status == :active

      participants =
        Chironium.Health.CareTeamParticipant
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
        |> Enum.filter(&(&1.care_team_id == care_team.id))

      assert length(participants) == 1
      assert hd(participants).practitioner_id == practitioner.id
    end

    test "patient created via create_patient_with_person is also immediately visible", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)
      practitioner = create_practitioner(ctx)
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)
      actor = enrich_actor(practitioner_user, ctx.tenant)

      {:ok, patient} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(
          :create_patient_with_person,
          %{person: %{name: [%{text: "Jane Doe"}]}},
          actor: actor,
          tenant: ctx.tenant
        )
        |> Ash.create()

      visible_ids =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)

      assert patient.id in visible_ids
    end

    test "practitioner does not see patients created by other practitioners",
         ctx do
      prac_user_a = generate(user())
      create_membership(ctx.organization.id, prac_user_a.id, :member)
      prac_a = create_practitioner(ctx)
      grant_practitioner(ctx, prac_user_a.id, prac_a.id)

      prac_user_b = generate(user())
      create_membership(ctx.organization.id, prac_user_b.id, :member)
      prac_b = create_practitioner(ctx)
      grant_practitioner(ctx, prac_user_b.id, prac_b.id)

      actor_a = enrich_actor(prac_user_a, ctx.tenant)
      actor_b = enrich_actor(prac_user_b, ctx.tenant)

      {:ok, _patient_a} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: actor_a, tenant: ctx.tenant)
        |> Ash.create()

      {:ok, _patient_b} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: actor_b, tenant: ctx.tenant)
        |> Ash.create()

      visible_a =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor_a, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)

      visible_b =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor_b, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)

      assert length(visible_a) == 1
      assert length(visible_b) == 1
      assert hd(visible_a).id != hd(visible_b).id
    end
  end

  # ---------------------------------------------------------------------------
  # Power user actor
  # ---------------------------------------------------------------------------

  describe "power user creates patient" do
    test "no CareTeam is auto-created for a power user (org owner)", ctx do
      {:ok, _patient} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: ctx.owner, tenant: ctx.tenant)
        |> Ash.create()

      care_teams = Chironium.Health.CareTeam |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
      assert care_teams == []
    end

    test "no CareTeam is auto-created for a power_user role member", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      {:ok, _patient} =
        Chironium.Health.Patient
        |> Ash.Changeset.for_create(:create, %{}, actor: power_user, tenant: ctx.tenant)
        |> Ash.create()

      care_teams = Chironium.Health.CareTeam |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
      assert care_teams == []
    end
  end

  # -- Helpers ----------------------------------------------------------------

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
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
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
end
