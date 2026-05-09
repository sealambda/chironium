defmodule Chironium.Health.TaskUpdateReminderTest do
  @moduledoc """
  Tests the authorization and pending-state rules for updating task reminders.
  """

  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe ":update_reminder action" do
    test "practitioner in care team can update a ready reminder", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient, :ready)

      new_start = DateTime.add(DateTime.utc_now(), 5, :day)
      new_end = DateTime.add(new_start, 1, :hour)
      new_description = "Updated reminder"

      assert {:ok, updated} =
               task
               |> Ash.Changeset.for_update(
                 :update_reminder,
                 %{
                   description: new_description,
                   requested_period: %{start: new_start, end: new_end}
                 },
                 actor: actor,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert updated.description == new_description

      assert DateTime.compare(
               updated.requested_period.start,
               DateTime.truncate(new_start, :second)
             ) == :eq

      assert DateTime.compare(updated.requested_period.end, DateTime.truncate(new_end, :second)) ==
               :eq
    end

    test "practitioner outside the care team cannot reschedule the reminder", ctx do
      {_actor, patient} = setup_practitioner_with_patient(ctx)
      {outsider, _other_patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient, :ready)

      assert {:error, %Ash.Error.Forbidden{}} =
               task
               |> Ash.Changeset.for_update(
                 :update_reminder,
                 %{requested_period: %{start: DateTime.add(DateTime.utc_now(), 3, :day)}},
                 actor: outsider,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end

    test "completed reminders cannot be rescheduled", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient, :completed)

      assert_raise Ash.Error.Invalid, ~r/Only pending reminders can be edited/i, fn ->
        task
        |> Ash.Changeset.for_update(
          :update_reminder,
          %{requested_period: %{start: DateTime.add(DateTime.utc_now(), 2, :day)}},
          actor: actor,
          tenant: ctx.tenant
        )
        |> Ash.update!()
      end
    end

    test "practitioner in care team can delete a ready reminder", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient, :ready)

      assert :ok =
               task
               |> Ash.Changeset.for_destroy(:delete_reminder, %{}, actor: actor, tenant: ctx.tenant)
               |> Ash.destroy()

      assert {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} =
               Ash.get(Chironium.Health.Task, task.id, actor: actor, tenant: ctx.tenant)
    end

    test "completed reminders cannot be deleted", ctx do
      {actor, patient} = setup_practitioner_with_patient(ctx)
      task = create_task(ctx, patient, :completed)

      assert_raise Ash.Error.Invalid, ~r/Only pending reminders can be deleted/i, fn ->
        task
        |> Ash.Changeset.for_destroy(:delete_reminder, %{}, actor: actor, tenant: ctx.tenant)
        |> Ash.destroy!()
      end
    end
  end

  defp setup_practitioner_with_patient(ctx) do
    practitioner_user = generate(user())
    create_membership(ctx.organization.id, practitioner_user.id, :member)

    practitioner = create_practitioner(ctx)
    grant_practitioner(ctx, practitioner_user.id, practitioner.id)

    patient = create_patient(ctx)
    care_team = create_care_team(ctx, patient, :active)
    add_participant(ctx, care_team, practitioner)

    {Chironium.Accounts.ActorResolver.resolve(practitioner_user, ctx.tenant), patient}
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
      %{name: [%{text: "Dr. Reminder"}]},
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
      %{status: status, name: "Reminder Team", subject_patient_id: patient.id},
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

  defp create_task(ctx, patient, status) do
    task =
      Chironium.Health.Task
      |> Ash.Changeset.for_create(
        :create,
        %{
          for_patient_id: patient.id,
          intent: :order,
          requested_period: %{start: DateTime.add(DateTime.utc_now(), 1, :day)}
        },
        authorize?: false,
        tenant: ctx.tenant
      )
      |> Ash.create!()

    transition_to(task, status, ctx.tenant)
  end

  defp transition_to(task, :draft, _tenant), do: task

  defp transition_to(task, :ready, tenant) do
    task
    |> Ash.Changeset.for_update(:ready, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
  end

  defp transition_to(task, :completed, tenant) do
    task
    |> Ash.Changeset.for_update(:ready, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:start, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:complete, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
  end
end
