defmodule Chironium.Workers.NotificationEmailWorker do
  @moduledoc """
  Oban worker that builds and delivers email notifications.
  """

  use Oban.Worker, queue: :notifications
  use Gettext, backend: ChironiumWeb.Gettext

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

    case Mailer.deliver(email) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
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

  defp from_address do
    config = Application.get_env(:chironium, :email_from, [])

    {Keyword.get(config, :name, "Chironium"),
     Keyword.get(config, :address, "chironium@updates.appfor.it")}
  end
end
