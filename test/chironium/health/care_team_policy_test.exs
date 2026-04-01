defmodule Chironium.Health.CareTeamPolicyTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # CareTeam reads
  # ---------------------------------------------------------------------------

  describe "CareTeam reads" do
    test "practitioner in the team can read it", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)
      add_participant(ctx, care_team, practitioner)

      actor = resolve_practitioner_actor(ctx, practitioner)

      results = Chironium.Health.CareTeam |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(results, &(&1.id == care_team.id))
    end

    test "practitioner NOT in team cannot read it", ctx do
      practitioner_a = create_practitioner(ctx)
      practitioner_b = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)
      add_participant(ctx, care_team, practitioner_a)

      actor = resolve_practitioner_actor(ctx, practitioner_b)

      results = Chironium.Health.CareTeam |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert results == []
    end

    test "inactive care teams are invisible to practitioners", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :inactive)
      add_participant(ctx, care_team, practitioner)

      actor = resolve_practitioner_actor(ctx, practitioner)

      results = Chironium.Health.CareTeam |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert results == []
    end

    test "power user sees all care teams", ctx do
      patient = create_patient(ctx)
      team_a = create_care_team(ctx, patient, :active)
      team_b = create_care_team(ctx, patient, :inactive)

      results = Chironium.Health.CareTeam |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)
      ids = Enum.map(results, & &1.id)
      assert team_a.id in ids
      assert team_b.id in ids
    end
  end

  # ---------------------------------------------------------------------------
  # CareTeam writes
  # ---------------------------------------------------------------------------

  describe "CareTeam writes" do
    test "power user can create a care team", ctx do
      patient = create_patient(ctx)

      assert {:ok, _} =
               Chironium.Health.CareTeam
               |> Ash.Changeset.for_create(
                 :create,
                 %{status: :active, name: "New team", subject_patient_id: patient.id},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "regular member cannot create a care team", ctx do
      prac_user = generate(user())
      create_membership(ctx.organization.id, prac_user.id, :member)
      practitioner = create_practitioner(ctx)
      grant_practitioner(ctx, prac_user.id, practitioner.id)
      actor = enrich_actor(prac_user, ctx.tenant)
      patient = create_patient(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Health.CareTeam
               |> Ash.Changeset.for_create(
                 :create,
                 %{status: :active, name: "Hijacked team", subject_patient_id: patient.id},
                 actor: actor,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "power user can destroy a care team", ctx do
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)

      assert :ok =
               care_team
               |> Ash.Changeset.for_destroy(:destroy, %{},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.destroy()
    end
  end

  # ---------------------------------------------------------------------------
  # CareTeamParticipant reads
  # ---------------------------------------------------------------------------

  describe "CareTeamParticipant reads" do
    test "practitioner in team can read all participants of that team", ctx do
      practitioner = create_practitioner(ctx)
      other_prac = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)
      add_participant(ctx, care_team, practitioner)
      participant = add_participant(ctx, care_team, other_prac)

      actor = resolve_practitioner_actor(ctx, practitioner)

      results =
        Chironium.Health.CareTeamParticipant |> Ash.read!(actor: actor, tenant: ctx.tenant)

      assert Enum.any?(results, &(&1.id == participant.id))
    end

    test "practitioner NOT in team cannot read participants of that team", ctx do
      practitioner_a = create_practitioner(ctx)
      practitioner_b = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)
      add_participant(ctx, care_team, practitioner_a)

      actor = resolve_practitioner_actor(ctx, practitioner_b)

      results =
        Chironium.Health.CareTeamParticipant |> Ash.read!(actor: actor, tenant: ctx.tenant)

      assert results == []
    end

    test "power user sees all participants", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)
      _participant = add_participant(ctx, care_team, practitioner)

      results =
        Chironium.Health.CareTeamParticipant |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)

      assert length(results) == 1
    end
  end

  # ---------------------------------------------------------------------------
  # CareTeamParticipant writes
  # ---------------------------------------------------------------------------

  describe "CareTeamParticipant writes" do
    test "regular member cannot add themselves to a care team", ctx do
      prac_user = generate(user())
      create_membership(ctx.organization.id, prac_user.id, :member)
      practitioner = create_practitioner(ctx)
      grant_practitioner(ctx, prac_user.id, practitioner.id)
      actor = enrich_actor(prac_user, ctx.tenant)

      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Health.CareTeamParticipant
               |> Ash.Changeset.for_create(
                 :create,
                 %{care_team_id: care_team.id, practitioner_id: practitioner.id},
                 actor: actor,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "power user can add a participant", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient, :active)

      assert {:ok, _} =
               Chironium.Health.CareTeamParticipant
               |> Ash.Changeset.for_create(
                 :create,
                 %{care_team_id: care_team.id, practitioner_id: practitioner.id},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

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

  # Creates a user → grant → practitioner actor without a care team assignment.
  defp resolve_practitioner_actor(ctx, practitioner) do
    prac_user = generate(user())
    create_membership(ctx.organization.id, prac_user.id, :member)
    grant_practitioner(ctx, prac_user.id, practitioner.id)
    enrich_actor(prac_user, ctx.tenant)
  end

  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant)
  end
end
