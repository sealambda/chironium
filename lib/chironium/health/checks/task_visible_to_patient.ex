defmodule Chironium.Health.Checks.TaskVisibleToPatient do
  @moduledoc """
  Filter check that shows a patient their own open questionnaire requests.

  A link-scoped session (`scope: %{task_ids: [...]}` metadata) sees only the
  tasks in its scope; an unscoped patient sees all of their own. Non-patient
  actors see nothing.
  """

  use Ash.Policy.FilterCheck

  @open_statuses [:requested, :received, :accepted, :in_progress]

  @impl true
  def describe(_opts), do: "task is the patient's own open questionnaire request"

  @impl true
  def filter(%Chironium.Health.Patient{} = patient, _authorizer, _opts) do
    base =
      expr(
        for_patient_id == ^patient.id and not is_nil(focus_questionnaire_id) and
          status in ^@open_statuses
      )

    case scope_task_ids(patient) do
      nil -> base
      task_ids -> expr(^base and id in ^task_ids)
    end
  end

  def filter(_, _, _), do: false

  @doc "The statuses in which a questionnaire request can still be answered."
  def open_statuses, do: @open_statuses

  @doc "Task IDs the patient's session is limited to, or `nil` when unscoped."
  def scope_task_ids(patient) do
    case patient.__metadata__[:scope] do
      %{task_ids: task_ids} -> task_ids
      _ -> nil
    end
  end
end
