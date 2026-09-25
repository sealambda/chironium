defmodule Chironium.Workers.NotificationEmailWorker do
  @moduledoc """
  Oban worker that builds and delivers email notifications.
  """

  use Oban.Worker, queue: :notifications
  use Gettext, backend: ChironiumWeb.Gettext

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.QuestionnaireRequests
  alias Chironium.Health.Task
  alias Chironium.Mailer
  alias Chironium.Mailer.Renderer

  @fallback_locale "en"

  @impl true
  def perform(%Oban.Job{args: %{"type" => type, "params" => params}}) do
    locale = params["locale"] || @fallback_locale

    email =
      Gettext.with_locale(ChironiumWeb.Gettext, locale, fn ->
        build_email(type, params)
      end)

    with %Swoosh.Email{} <- email,
         {:ok, _} <- Mailer.deliver(email) do
      :ok
    end
  end

  # The job holds IDs only: the sign-in token is minted here, so it never sits
  # in `oban_jobs`, and a retry can't send a link that was revoked meanwhile.
  defp build_email("questionnaire_requested", %{"guest_access_id" => id, "tenant" => tenant}) do
    with {:ok, access} <- Ash.get(GuestAccess, id, authorize?: false),
         :ok <- sendable(access),
         {:ok, task} <-
           Ash.get(Task, access.task_id,
             tenant: tenant,
             authorize?: false,
             load: [:requester_name, :organization_name, :focus_questionnaire]
           ),
         email when is_binary(email) <-
           QuestionnaireRequests.patient_email(access.principal_id, tenant),
         {:ok, url} <- GuestAccess.sign_in_url(access) do
      locale = organization_locale(access.organization_id)

      Gettext.with_locale(ChironiumWeb.Gettext, locale, fn ->
        %{html: html, text: text} =
          Renderer.render(&ChironiumWeb.Emails.QuestionnaireRequestedEmail.render/1, %{
            requester_name: task.requester_name,
            organization_name: task.organization_name,
            questionnaire_title: task.focus_questionnaire && task.focus_questionnaire.title,
            message: task.description,
            expires_on: format_date(access.expires_at, locale),
            url: url
          })

        {from_name, from_address} = from_address()

        subject =
          dgettext("emails", "%{organization} sent you a questionnaire",
            organization: task.organization_name
          )

        Swoosh.Email.new()
        |> Swoosh.Email.to(email)
        |> Swoosh.Email.from({from_name, from_address})
        |> Swoosh.Email.subject(subject)
        |> Swoosh.Email.html_body(html)
        |> Swoosh.Email.text_body(text)
      end)
    else
      _ -> {:cancel, "Questionnaire link #{id} is no longer active or has no recipient."}
    end
  end

  defp build_email("invitation_created", params) do
    %{html: html, text: text} =
      Renderer.render(&ChironiumWeb.Emails.InvitationEmail.render/1, %{
        invited_by_name: params["invited_by_name"],
        organization_name: params["organization_name"],
        code: params["code"],
        accept_url: params["accept_url"]
      })

    {from_name, from_address} = from_address()

    subject =
      dgettext("emails", "You've been invited to %{organization}",
        organization: params["organization_name"]
      )

    Swoosh.Email.new()
    |> Swoosh.Email.to(params["email"])
    |> Swoosh.Email.from({from_name, from_address})
    |> Swoosh.Email.subject(subject)
    |> Swoosh.Email.html_body(html)
    |> Swoosh.Email.text_body(text)
  end

  defp build_email("task_reminder", params) do
    %{html: html, text: text} =
      Renderer.render(&ChironiumWeb.Emails.TaskReminderEmail.render/1, %{
        recipient_name: params["recipient_name"],
        task_description: params["task_description"],
        task_priority: params["task_priority"],
        patient_name: params["patient_name"],
        task_url: params["task_url"]
      })

    {from_name, from_address} = from_address()

    subject =
      dgettext("emails", "Task reminder: %{description}", description: params["task_description"])

    Swoosh.Email.new()
    |> Swoosh.Email.to(params["email"])
    |> Swoosh.Email.from({from_name, from_address})
    |> Swoosh.Email.subject(subject)
    |> Swoosh.Email.html_body(html)
    |> Swoosh.Email.text_body(text)
  end

  defp sendable(access) do
    if access.channel == :email and is_nil(access.claimed_at) and is_nil(access.revoked_at) and
         DateTime.after?(access.expires_at, DateTime.utc_now()),
       do: :ok,
       else: :inactive
  end

  defp organization_locale(organization_id) do
    case Ash.get(Chironium.Accounts.Organization, organization_id, authorize?: false) do
      {:ok, %{preferred_locale: locale}} when is_binary(locale) -> locale
      _ -> @fallback_locale
    end
  end

  defp format_date(datetime, locale) do
    date = DateTime.to_date(datetime)

    case Chironium.Cldr.Date.to_string(date, format: :long, locale: locale) do
      {:ok, formatted} -> formatted
      {:error, _} -> Date.to_iso8601(date)
    end
  end

  defp from_address do
    config = Application.get_env(:chironium, :email_from, [])

    {Keyword.get(config, :name, "Chironium"),
     Keyword.get(config, :address, "chironium@updates.appfor.it")}
  end
end
