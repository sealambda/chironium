defmodule Chironium.Health.PatientFilterByPractitionerTest do
  @moduledoc """
  Verifies that the `:practitioner_id` argument on Patient `:list` correctly
  filters patients to those assigned to a given practitioner via active
  CareTeams with active participations.
  """

  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "filter by practitioner_id" do
    test "returns only patients assigned to the given practitioner", ctx do
      prac_a = create_practitioner(ctx, "Dr A")
      prac_b = create_practitioner(ctx, "Dr B")

      patient_a = create_patient(ctx)
      patient_b = create_patient(ctx)
      patient_both = create_patient(ctx)

      ct_a = create_care_team(ctx, patient_a, :active, "Team A")
      add_participant(ctx, ct_a, prac_a)

      ct_b = create_care_team(ctx, patient_b, :active, "Team B")
      add_participant(ctx, ct_b, prac_b)

      ct_both = create_care_team(ctx, patient_both, :active, "Team Both")
      add_participant(ctx, ct_both, prac_a)
      add_participant(ctx, ct_both, prac_b)

      result_ids =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac_a.id},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert result_ids == MapSet.new([patient_a.id, patient_both.id])
    end

    test "returns empty when practitioner has no patients", ctx do
      prac = create_practitioner(ctx, "Dr Lonely")
      _patient = create_patient(ctx)

      results =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac.id},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)

      assert results == []
    end

    test "excludes patients from inactive care teams", ctx do
      prac = create_practitioner(ctx, "Dr Inactive CT")
      patient = create_patient(ctx)

      ct = create_care_team(ctx, patient, :inactive, "Inactive Team")
      add_participant(ctx, ct, prac)

      results =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac.id},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)

      assert results == []
    end

    test "excludes patients where the practitioner participation is inactive", ctx do
      prac = create_practitioner(ctx, "Dr Inactive Part")
      patient = create_patient(ctx)

      ct = create_care_team(ctx, patient, :active, "Active Team")
      add_participant(ctx, ct, prac, active: false)

      results =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac.id},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)

      assert results == []
    end

    test "returns all patients when practitioner_id is not provided", ctx do
      _prac = create_practitioner(ctx, "Dr Irrelevant")
      _patient_a = create_patient(ctx)
      _patient_b = create_patient(ctx)

      results =
        Chironium.Health.Patient
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant, page: [limit: 100])

      assert length(results.results) == 2
    end

    test "filter works together with policy-based visibility", ctx do
      prac_user = generate(user())
      create_membership(ctx.organization.id, prac_user.id, :member)

      prac_a = create_practitioner(ctx, "Dr A")
      prac_b = create_practitioner(ctx, "Dr B")
      grant_practitioner(ctx, prac_user.id, prac_a.id)

      patient_a = create_patient(ctx)
      patient_b = create_patient(ctx)

      ct_a = create_care_team(ctx, patient_a, :active, "Team A")
      add_participant(ctx, ct_a, prac_a)

      ct_b = create_care_team(ctx, patient_b, :active, "Team B")
      add_participant(ctx, ct_b, prac_b)

      actor = enrich_actor(prac_user, ctx.tenant)

      # Without filter: practitioner sees only their own patients (policy).
      visible =
        Chironium.Health.Patient
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)

      assert length(visible) == 1
      assert hd(visible).id == patient_a.id

      # With filter for prac_b: policy restricts to prac_a's patients, so the
      # intersection with prac_b's patients is empty.
      filtered =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac_b.id},
          actor: actor,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)

      assert filtered == []
    end

    test "returns correct results when a patient has multiple care teams", ctx do
      prac = create_practitioner(ctx, "Dr Multi")
      patient = create_patient(ctx)

      ct_1 = create_care_team(ctx, patient, :active, "Team 1")
      ct_2 = create_care_team(ctx, patient, :active, "Team 2")
      add_participant(ctx, ct_1, prac)
      add_participant(ctx, ct_2, prac)

      results =
        Chironium.Health.Patient
        |> Ash.Query.for_read(:list, %{practitioner_id: prac.id},
          actor: ctx.owner,
          tenant: ctx.tenant
        )
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)

      # Patient should appear only once despite being in two matching care teams.
      assert length(results) == 1
      assert hd(results).id == patient.id
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

  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant)
  end
end
