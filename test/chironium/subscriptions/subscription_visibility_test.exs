defmodule Chironium.Subscriptions.SubscriptionVisibilityTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    plan =
      Chironium.Subscriptions.Plan
      |> Ash.Changeset.for_create(
        :create,
        %{
          name: "Monthly",
          duration: %{value: 1, code: :mo},
          price_amount: %{amount: "49.99", currency: :EUR}
        },
        actor: owner,
        tenant: tenant,
        authorize?: false
      )
      |> Ash.create!()

    %{owner: owner, organization: organization, tenant: tenant, plan: plan}
  end

  describe "power user visibility" do
    test "owner sees all subscriptions", ctx do
      _sub_a = create_subscription_for_new_patient(ctx)
      _sub_b = create_subscription_for_new_patient(ctx)

      visible =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 2
    end

    test "power user sees all subscriptions", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      _sub_a = create_subscription_for_new_patient(ctx)
      _sub_b = create_subscription_for_new_patient(ctx)

      visible =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: power_user, tenant: ctx.tenant, page: [limit: 100])

      assert length(visible.results) == 2
    end
  end

  describe "practitioner-based visibility (direct listSubscriptions)" do
    test "practitioner sees subscriptions for patients in their active care teams", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Assigned")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      assigned_patient = create_patient_with_person(ctx)
      _unassigned_patient = create_patient_with_person(ctx)

      care_team = create_care_team(ctx, assigned_patient, :active, "Assigned team")
      add_participant(ctx, care_team, practitioner)

      assigned_sub = create_subscription(ctx, assigned_patient.person_id)
      _other_sub = create_subscription_for_new_patient(ctx)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible_ids =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])
        |> Map.fetch!(:results)
        |> Enum.map(& &1.id)
        |> MapSet.new()

      assert MapSet.equal?(visible_ids, MapSet.new([assigned_sub.id]))
    end

    test "practitioner sees nothing when their care team is inactive", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Inactive")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, patient, :inactive, "Old team")
      add_participant(ctx, care_team, practitioner)

      _sub = create_subscription(ctx, patient.person_id)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

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

      _sub = create_subscription(ctx, patient.person_id)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      visible =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end

    test "member without a grant sees no subscriptions", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      _sub = create_subscription_for_new_patient(ctx)

      actor = enrich_actor(member, ctx.tenant)

      visible =
        Chironium.Subscriptions.Subscription
        |> Ash.read!(actor: actor, tenant: ctx.tenant, page: [limit: 100])

      assert visible.results == []
    end
  end

  describe "practitioner pause mutations (direct updateSubscriptionPause)" do
    test "practitioner can update a pause on a visible subscription", ctx do
      practitioner_user = generate(user())
      create_membership(ctx.organization.id, practitioner_user.id, :member)

      practitioner = create_practitioner(ctx, "Dr Pause Editor")
      grant_practitioner(ctx, practitioner_user.id, practitioner.id)

      patient = create_patient_with_person(ctx)
      care_team = create_care_team(ctx, patient, :active, "Pause team")
      add_participant(ctx, care_team, practitioner)

      sub = create_subscription(ctx, patient.person_id)

      sub =
        sub
        |> Ash.Changeset.for_update(:suspend, %{reason: "Original reason"},
          actor: ctx.owner,
          tenant: ctx.tenant,
          authorize?: false
        )
        |> Ash.update!()

      pause =
        Chironium.Subscriptions.SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^sub.id)
        |> Ash.read_one!(tenant: ctx.tenant, authorize?: false)

      actor = enrich_actor(practitioner_user, ctx.tenant)

      updated =
        pause
        |> Ash.Changeset.for_update(:update, %{
          reason: "Updated reason",
          start_date: pause.start_date,
          end_date: Date.add(pause.start_date, 3)
        }, actor: actor, tenant: ctx.tenant)
        |> Ash.update!()

      assert updated.reason == "Updated reason"
      assert updated.end_date == Date.add(pause.start_date, 3)
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
            %{use: :official, family: Faker.Person.last_name(), given: [Faker.Person.first_name()]}
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

  defp create_subscription(ctx, subscriber_id) do
    Chironium.Subscriptions.Subscription
    |> Ash.Changeset.for_create(
      :create,
      %{subscriber_id: subscriber_id, plan_id: ctx.plan.id, start_date: Date.utc_today()},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_subscription_for_new_patient(ctx) do
    patient = create_patient_with_person(ctx)
    create_subscription(ctx, patient.person_id)
  end

  defp enrich_actor(user, tenant) do
    Chironium.Accounts.ActorResolver.resolve(user, tenant)
  end
end
