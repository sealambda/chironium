defmodule Chironium.CRM.PersonVisibilityTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "power user visibility" do
    test "owner sees all persons", ctx do
      _patient_a = create_patient_with_person(ctx)
      _patient_b = create_patient_with_person(ctx)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: ctx.owner, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 2
    end

    test "power user sees all persons", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      _patient_a = create_patient_with_person(ctx)
      _patient_b = create_patient_with_person(ctx)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: power_user, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 2
    end

    test "power user can filter to unassigned persons", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      practitioner = create_practitioner(ctx, "Dr Assigned")
      assigned_patient = create_patient_with_person(ctx)
      unassigned_patient = create_patient_with_person(ctx)
      orphan_person = create_person_without_patient(ctx)

      care_team = create_care_team(ctx, assigned_patient, :active, "Assigned team")
      add_participant(ctx, care_team, practitioner)

      visible_ids =
        Chironium.CRM.Person
        |> Ash.Query.for_read(:list, %{unassigned: true}, actor: power_user, tenant: ctx.tenant)
        |> Ash.read!(page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert MapSet.equal?(
               visible_ids,
               MapSet.new([unassigned_patient.person_id, orphan_person.id])
             )
    end
  end

  describe "practitioner-based visibility (direct listPersons)" do
    test "practitioner sees persons associated with their active care team patients", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Assigned")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient_assigned = create_patient_with_person(ctx)
      _patient_unassigned = create_patient_with_person(ctx)

      care_team = create_care_team(ctx, patient_assigned, :active, "Assigned team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible_ids =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert MapSet.equal?(visible_ids, MapSet.new([patient_assigned.person_id]))
    end

    test "practitioner sees nothing when their care team is inactive", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Inactive")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, patient, :inactive, "Old team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "practitioner sees nothing when participation is inactive", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Inactive Part")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, patient, :active, "Active team")
      add_participant(ctx, care_team, practitioner, active: false)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "practitioner cannot use the unassigned filter to see extra persons", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Restricted")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      _unassigned_patient = create_patient_with_person(ctx)
      _orphan_person = create_person_without_patient(ctx)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.CRM.Person
        |> Ash.Query.for_read(:list, %{unassigned: true}, actor: actor, tenant: ctx.tenant)
        |> Ash.read!(page: [limit: 100])

      assert visible.results == []
    end

    test "member without a grant sees no persons", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      _patient = create_patient_with_person(ctx)

      actor = enrich_actor(member, ctx.tenant)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "practitioner only sees their assigned persons among many unrelated patients", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Scale")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      # Create several unrelated patients that the practitioner cannot see.
      for _ <- 1..8 do
        create_patient_with_person(ctx)
      end

      # Create the one patient the practitioner is assigned to.
      assigned_patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, assigned_patient, :active, "Scale team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)

      assert length(visible) == 1
      assert hd(visible).id == assigned_patient.person_id
    end

    test "person without a linked patient is invisible to non-power-users", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Orphan")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      # Create a patient with no care team — practitioner cannot see them.
      _patient = create_patient_with_person(ctx)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Ash.read!(Chironium.CRM.Person, actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end
  end

  describe "person accessible via relationship load" do
    test "practitioner can load person through a visible patient", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Load")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, patient, :active, "Load team")
      add_participant(ctx, care_team, practitioner)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      loaded =
        Chironium.Health.Patient
        |> Ash.Query.new()
        |> Ash.Query.load(:person)
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert [loaded_patient] = loaded.results
      assert loaded_patient.id == patient.id
      assert %Chironium.CRM.Person{} = loaded_patient.person
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

  defp create_patient_with_person(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(
      :create_patient_with_person,
      %{
        person: %{
          name: [
            %{
              use: :official,
              family: Faker.Person.last_name(),
              given: [Faker.Person.first_name()]
            }
          ],
          gender: :other
        }
      },
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_person_without_patient(ctx) do
    Chironium.CRM.Person
    |> Ash.Changeset.for_create(
      :create,
      %{
        name: [
          %{use: :official, family: Faker.Person.last_name(), given: [Faker.Person.first_name()]}
        ],
        gender: :other
      },
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
    Chironium.Accounts.ActorResolver.resolve(user, tenant, principal_types: [:practitioner])
  end
end
