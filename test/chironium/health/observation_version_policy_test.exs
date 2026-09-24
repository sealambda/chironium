defmodule Chironium.Health.ObservationVersionPolicyTest do
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "belongs_to_actor access" do
    test "power user can load changed_by and changed_by_practitioner on versions", ctx do
      patient = create_patient(ctx)
      practitioner = create_practitioner(ctx)
      practitioner_actor = resolve_practitioner_actor(ctx, practitioner)

      observation = create_observation(ctx, practitioner_actor, patient.id)
      _updated = update_observation(ctx, observation, ctx.owner)

      versions =
        Chironium.Health.Observation.Version
        |> Ash.Query.filter(version_source_id == ^observation.id)
        |> Ash.Query.load([:changed_by, :changed_by_practitioner])
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)

      assert Enum.any?(versions, &(&1.changed_by_practitioner && &1.changed_by_practitioner.id == practitioner.id))
      assert Enum.any?(versions, &(&1.changed_by && &1.changed_by.id == ctx.owner.id))
    end

    test "practitioner actor can load changed_by_practitioner when observation is visible", ctx do
      patient = create_patient(ctx)
      practitioner = create_practitioner(ctx)
      practitioner_actor = resolve_practitioner_actor(ctx, practitioner)

      care_team = create_care_team(ctx, patient)
      _participant = add_participant(ctx, care_team, practitioner)

      observation = create_observation(ctx, practitioner_actor, patient.id)

      loaded =
        Chironium.Health.Observation
        |> Ash.Query.filter(id == ^observation.id)
        |> Ash.Query.load(paper_trail_versions: [:changed_by_practitioner])
        |> Ash.read_one!(actor: practitioner_actor, tenant: ctx.tenant)

      assert loaded

      assert Enum.any?(
               loaded.paper_trail_versions,
               &(&1.changed_by_practitioner && &1.changed_by_practitioner.id == practitioner.id)
             )
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

  defp create_practitioner(ctx) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: "Dr. Policy"}]},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_care_team(ctx, patient) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: :active, name: "Visibility Team", subject_patient_id: patient.id},
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

  defp create_observation(ctx, actor, patient_id) do
    Chironium.Health.Observation
    |> Ash.Changeset.for_create(
      :create,
      %{subject_id: patient_id, value_string: "Initial value"},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp update_observation(ctx, observation, actor) do
    observation
    |> Ash.Changeset.for_update(
      :update,
      %{value_string: "Updated value"},
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.update!()
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

  defp resolve_practitioner_actor(ctx, practitioner) do
    user = generate(user())
    create_membership(ctx.organization.id, user.id, :member)

    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: user.id,
        principal_type: :practitioner,
        principal_id: practitioner.id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()

    Chironium.Accounts.ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])
  end
end
