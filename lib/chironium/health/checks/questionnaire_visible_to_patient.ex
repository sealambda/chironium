defmodule Chironium.Health.Checks.QuestionnaireVisibleToPatient do
  @moduledoc """
  Filter check that shows a patient the questionnaires of the requests they
  can see, following the same rules as `TaskVisibleToPatient`.
  """

  use Ash.Policy.FilterCheck

  alias Chironium.Health.Checks.TaskVisibleToPatient

  @impl true
  def describe(_opts), do: "questionnaire belongs to one of the patient's open requests"

  @impl true
  def filter(%Chironium.Health.Patient{} = patient, _authorizer, _opts) do
    open_statuses = TaskVisibleToPatient.open_statuses()

    case TaskVisibleToPatient.scope_task_ids(patient) do
      nil ->
        expr(exists(tasks, for_patient_id == ^patient.id and status in ^open_statuses))

      task_ids ->
        expr(
          exists(
            tasks,
            for_patient_id == ^patient.id and status in ^open_statuses and id in ^task_ids
          )
        )
    end
  end

  def filter(_, _, _), do: false
end
