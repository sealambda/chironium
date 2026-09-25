defmodule Chironium.Health.QuestionnaireResponse.Changes.SubmitFromPortal do
  @moduledoc """
  Fills in a patient's own response from the questionnaire request it answers.

  The patient only sends answers. The subject, author, questionnaire and task
  come from the server: the task must be the patient's own open request and
  within their session's scope. Runs as the first `before_action`, so
  `NormalizeAnswerTree` sees the questionnaire it sets.
  """

  use Ash.Resource.Change

  alias Chironium.Health.Checks.TaskVisibleToPatient
  alias Chironium.Health.Patient
  alias Chironium.Health.Task

  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.before_action(changeset, &put_request(&1, context.actor))
  end

  defp put_request(changeset, %Patient{} = patient) do
    task_id = Ash.Changeset.get_argument(changeset, :task_id)

    with :ok <- in_scope(patient, task_id),
         {:ok, task} <- Ash.get(Task, task_id, tenant: changeset.tenant, authorize?: false),
         :ok <- answerable(task, patient) do
      Ash.Changeset.force_change_attributes(changeset, %{
        subject_id: patient.id,
        author_patient_id: patient.id,
        questionnaire_id: task.focus_questionnaire_id,
        task_id: task.id,
        status: :completed,
        authored: DateTime.utc_now()
      })
    else
      _ ->
        Ash.Changeset.add_error(changeset,
          field: :task_id,
          message: "Questionnaire request #{task_id} is not open for this patient."
        )
    end
  end

  defp put_request(changeset, _actor) do
    Ash.Changeset.add_error(changeset, message: "Only a patient can submit from the portal.")
  end

  defp in_scope(patient, task_id) do
    case TaskVisibleToPatient.scope_task_ids(patient) do
      nil -> :ok
      task_ids -> if task_id in task_ids, do: :ok, else: :error
    end
  end

  defp answerable(task, patient) do
    if task.for_patient_id == patient.id and not is_nil(task.focus_questionnaire_id) and
         task.status in TaskVisibleToPatient.open_statuses(),
       do: :ok,
       else: :error
  end
end
