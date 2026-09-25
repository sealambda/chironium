defmodule Chironium.Health.Task.Changes.RequestQuestionnaire do
  @moduledoc """
  Builds a questionnaire request: the SDC task code, the due date, the message
  and the requester. The questionnaire must be active and readable by the
  actor; the patient is linked through `manage_relationship`, which reads it
  with the actor, so only visible patients can be targeted.
  """

  use Ash.Resource.Change

  alias Chironium.Health.Questionnaire
  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def change(changeset, _opts, context) do
    due_date = Ash.Changeset.get_argument(changeset, :due_date)
    # The client picks dates in local time: west of UTC, "today" can still be yesterday in UTC.
    earliest = Date.add(Date.utc_today(), -1)

    if due_date && Date.compare(due_date, earliest) == :lt do
      Ash.Changeset.add_error(changeset,
        field: :due_date,
        message: "The due date #{due_date} is in the past."
      )
    else
      now = DateTime.utc_now()

      changeset
      |> Ash.Changeset.force_change_attributes(%{
        code: QuestionnaireRequests.task_code(),
        intent: :order,
        description: Ash.Changeset.get_argument(changeset, :message),
        requested_period: requested_period(now, due_date),
        access_expires_at: QuestionnaireRequests.access_expires_at(due_date, now),
        requester_practitioner_id: requester_id(context.actor)
      })
      |> Ash.Changeset.before_action(&put_questionnaire(&1, context))
    end
  end

  defp put_questionnaire(changeset, context) do
    questionnaire_id = Ash.Changeset.get_argument(changeset, :questionnaire_id)

    case Ash.get(Questionnaire, questionnaire_id,
           tenant: changeset.tenant,
           actor: context.actor,
           authorize?: context.authorize?
         ) do
      {:ok, %{status: :active}} ->
        Ash.Changeset.force_change_attribute(changeset, :focus_questionnaire_id, questionnaire_id)

      {:ok, %{status: status}} ->
        Ash.Changeset.add_error(changeset,
          field: :questionnaire_id,
          message: "Questionnaire #{questionnaire_id} is #{status}; only active ones can be sent."
        )

      {:error, _} ->
        Ash.Changeset.add_error(changeset,
          field: :questionnaire_id,
          message: "Questionnaire #{questionnaire_id} was not found."
        )
    end
  end

  defp requested_period(now, nil), do: %{start: now}

  defp requested_period(now, due_date),
    do: %{start: now, end: QuestionnaireRequests.end_of_day(due_date)}

  # Power users act as their User and have no practitioner to record.
  defp requester_id(%Chironium.Health.Practitioner{id: id}), do: id
  defp requester_id(_actor), do: nil
end
