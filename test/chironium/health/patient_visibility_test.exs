defmodule Chironium.Health.PatientVisibilityTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "power user visibility" do
    test "power user sees all patients", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      _patient_a = create_patient(ctx)
      _patient_b = create_patient(ctx)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: power_user, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 2
    end

    test "organization owner sees all patients", ctx do
      _patient = create_patient(ctx)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 1
    end
  end

  describe "practitioner-based visibility" do
    test "practitioner sees only patients from their active care teams", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Assigned")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient_assigned = create_patient(ctx)
      _patient_unassigned = create_patient(ctx)

      care_team = create_care_team(ctx, patient_assigned, :active, "Assigned team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible_ids =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert visible_ids == MapSet.new([patient_assigned.id])
    end

    test "practitioner does not see patients from inactive care teams", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Inactive")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :inactive, "Old team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "practitioner with inactive participation sees nothing", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Inactive Part")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active, "Active team")
      add_participant(ctx, care_team, practitioner, active: false)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "user granted multiple practitioners sees union of their patients", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      prac_a = create_practitioner(ctx, "Dr A")
      prac_b = create_practitioner(ctx, "Dr B")
      grant_practitioner(ctx, practitioner_user.id, prac_a.id)
      grant_practitioner(ctx, practitioner_user.id, prac_b.id)

      patient_a = create_patient(ctx)
      patient_b = create_patient(ctx)

      ct_a = create_care_team(ctx, patient_a, :active, "Team A")
      ct_b = create_care_team(ctx, patient_b, :active, "Team B")
      add_participant(ctx, ct_a, prac_a)
      add_participant(ctx, ct_b, prac_b)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible_ids =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert visible_ids == MapSet.new([patient_a.id, patient_b.id])
    end
  end

  describe "access denial" do
    test "member without principal grant sees no patients", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      _patient = create_patient(ctx)

      actor = enrich_actor(member, ctx.tenant)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "user with revoked (inactive) principal grant sees no patients", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Revoked")

      Chironium.Accounts.PrincipalGrant
      |> Ash.Changeset.for_create(
        :create,
        %{
          user_id: practitioner_user.id,
          principal_type: :practitioner,
          principal_id: practitioner.id,
          active: false
        },
        authorize?: false,
        tenant: ctx.tenant
      )
      |> Ash.create!()

      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active, "Team")
      add_participant(ctx, care_team, practitioner)

      # Enriching loads only active grants, so revoked grants are excluded.
      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "request without actor sees no patients", ctx do
      _patient = create_patient(ctx)

      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: nil, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
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

  defp create_practitioner(ctx, name) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: name}]},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_care_team(ctx, patient, status, name) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: status, name: name, subject_patient_id: patient.id},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp add_participant(ctx, care_team, practitioner, opts \\ []) do
    Chironium.Health.CareTeamParticipant
    |> Ash.Changeset.for_create(
      :create,
      %{
        care_team_id: care_team.id,
        practitioner_id: practitioner.id,
        active: Keyword.get(opts, :active, true)
      },
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

  # Delegates to the same ActorResolver used by the SetTenant plug.
  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant, principal_types: [:practitioner])
  end
end
