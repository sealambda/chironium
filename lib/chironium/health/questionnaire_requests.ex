defmodule Chironium.Health.QuestionnaireRequests do
  @moduledoc """
  Sends questionnaires to patients as single-use links.

  A request is a FHIR SDC `complete-questionnaire` `Task`. Each delivery channel
  gets its own `Chironium.Accounts.GuestAccess`: a link the practitioner copies
  or shares, plus an email when the patient has an address. Claiming either one
  revokes the other, starts the task and opens the patient's session, which
  lasts until the response is submitted, the request is cancelled, or the
  access expires.
  """

  require Ash.Query
  require Logger

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.Task

  @min_lifetime_days 7
  @max_lifetime_days 14

  @sdc_task_codes "http://hl7.org/fhir/uv/sdc/CodeSystem/temp"

  @doc "The FHIR SDC task code for a questionnaire request."
  def task_code do
    %{
      coding: [
        %{
          system: @sdc_task_codes,
          code: "complete-questionnaire",
          display: "Complete Questionnaire"
        }
      ],
      text: "Complete questionnaire"
    }
  end

  @doc """
  When a request's links and session expire.

  At least 7 days from now, or a day after the due instant when that is later,
  and never more than 14 days from now: the session cookie's `max_age`, so a
  session never outlives its cookie silently.
  """
  def access_expires_at(due_at, now \\ DateTime.utc_now())

  def access_expires_at(nil, now), do: DateTime.add(now, @min_lifetime_days, :day)

  def access_expires_at(%DateTime{} = due_at, now) do
    floor = DateTime.add(now, @min_lifetime_days, :day)
    ceiling = DateTime.add(now, @max_lifetime_days, :day)

    due_at
    |> DateTime.add(1, :day)
    |> latest(floor)
    |> earliest(ceiling)
  end

  @doc """
  Issues the link and, when email is on and the patient has an email address,
  the email access for a task. Enqueues the email in the current transaction.

  Returns `{:ok, %{link_url: url, email_sent?: boolean}}`.
  """
  def issue_links(%Task{} = task, tenant) do
    {:ok, organization_id} = Chironium.Accounts.Authorization.organization_id_from_tenant(tenant)

    issue = fn channel ->
      GuestAccess.issue!(
        %{
          organization_id: organization_id,
          principal_type: :patient,
          principal_id: task.for_patient_id,
          task_id: task.id,
          channel: channel,
          expires_at: task.access_expires_at
        },
        authorize?: false
      )
    end

    with {:ok, link_url} <- GuestAccess.sign_in_url(issue.(:link)) do
      # With email off, no email access is issued: an unused one is still a
      # live credential.
      email_sent? =
        if Chironium.Notifications.email_enabled?() &&
             patient_email(task.for_patient_id, tenant) do
          email_access = issue.(:email)

          Chironium.Notifications.send(:questionnaire_requested, %{
            guest_access_id: email_access.id,
            tenant: tenant
          })

          true
        else
          false
        end

      {:ok, %{link_url: link_url, email_sent?: email_sent?}}
    end
  end

  @doc "Revokes every link and session issued for a task."
  def revoke_links(%Task{id: task_id}), do: GuestAccess.revoke_all_for_task(task_id)

  @doc """
  Claims an access after sign-in: marks it used, revokes its siblings and
  starts the task, attributed to the patient.
  """
  def claim(%GuestAccess{} = guest_access, patient) do
    tenant = GuestAccess.tenant(guest_access)

    with {:ok, claimed} <- GuestAccess.claim(guest_access, authorize?: false, actor: patient),
         {:ok, task} <- Ash.get(Task, claimed.task_id, tenant: tenant, authorize?: false) do
      if task.status == :requested do
        task
        |> Ash.Changeset.for_update(:start, %{},
          tenant: tenant,
          actor: patient,
          authorize?: false
        )
        |> Ash.update!()
      end

      {:ok, claimed}
    end
  end

  @doc "The patient's first email address, from their person record, or `nil`."
  def patient_email(patient_id, tenant) do
    case Ash.get(Chironium.Health.Patient, patient_id,
           tenant: tenant,
           authorize?: false,
           load: [:person]
         ) do
      {:ok, %{person: %{telecom: telecom}}} when is_list(telecom) ->
        Enum.find_value(telecom, fn
          %{system: :email, value: value} when is_binary(value) and value != "" -> value
          _ -> nil
        end)

      _ ->
        nil
    end
  end

  @doc "A display name from a FHIR `HumanName` list, or `nil`."
  def display_name([name | _]) do
    case name do
      %{text: text} when is_binary(text) and text != "" ->
        text

      %{} ->
        [name.prefix, name.given, name.family]
        |> Enum.flat_map(&List.wrap/1)
        |> Enum.reject(&(&1 in [nil, ""]))
        |> Enum.join(" ")
        |> case do
          "" -> nil
          display -> display
        end
    end
  end

  def display_name(_), do: nil

  defp latest(a, b), do: if(DateTime.compare(a, b) == :gt, do: a, else: b)
  defp earliest(a, b), do: if(DateTime.compare(a, b) == :lt, do: a, else: b)
end
