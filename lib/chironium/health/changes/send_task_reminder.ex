defmodule Chironium.Health.Changes.SendTaskReminder do
  @moduledoc """
  Change module that sends task reminder notifications to all active
  practitioners in the patient's care teams.
  """

  use Ash.Resource.Change

  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.after_action(changeset, fn _changeset, task ->
      tenant = context.tenant
      task = Ash.load!(task, :for_patient, tenant: tenant, authorize?: false)

      if task.for_patient do
        send_reminders(task, task.for_patient, tenant)
      end

      {:ok, task}
    end)
  end

  defp send_reminders(task, patient, tenant) do
    patient_name = resolve_patient_name(patient, tenant)

    patient.id
    |> resolve_practitioners(tenant)
    |> Enum.each(fn practitioner ->
      {email, locale} = resolve_practitioner_contact(practitioner, tenant)

      if email do
        Chironium.Notifications.send(:task_reminder, %{
          email: email,
          recipient_name: resolve_practitioner_name(practitioner),
          task_description: task.description || "Untitled task",
          task_priority: task.priority && to_string(task.priority),
          patient_name: patient_name,
          task_url: ChironiumWeb.AppUrl.url("/customers/#{patient.person_id}"),
          locale: locale
        })
      end
    end)
  end

  defp resolve_practitioners(patient_id, tenant) do
    Chironium.Health.CareTeam
    |> Ash.Query.filter_input(%{subject_patient_id: patient_id, status: :active})
    |> Ash.Query.load(participants: :practitioner)
    |> Ash.read!(tenant: tenant, authorize?: false)
    |> Enum.flat_map(& &1.participants)
    |> Enum.filter(& &1.active)
    |> Enum.map(& &1.practitioner)
    |> Enum.uniq_by(& &1.id)
  end

  defp resolve_patient_name(patient, tenant) do
    patient = Ash.load!(patient, [person: []], tenant: tenant, authorize?: false)

    case patient.person do
      nil -> "Patient"
      person -> QuestionnaireRequests.display_name(person.name)
    end
  end

  defp resolve_practitioner_name(practitioner) do
    QuestionnaireRequests.display_name(practitioner.name)
  end

  defp resolve_practitioner_contact(practitioner, tenant) do
    grant =
      Chironium.Accounts.PrincipalGrant
      |> Ash.Query.filter_input(%{
        principal_type: :practitioner,
        principal_id: practitioner.id,
        active: true
      })
      |> Ash.Query.load(:user)
      |> Ash.read_one!(authorize?: false, tenant: tenant)

    case grant do
      %{user: %{email: email, preferred_locale: locale}} when not is_nil(email) ->
        {to_string(email), locale || "en"}

      _ ->
        {nil, "en"}
    end
  end
end
