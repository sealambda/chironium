defmodule Chironium.Workers.NotificationEmailWorker do
  @moduledoc """
  Oban worker that builds and delivers email notifications.
  """

  use Oban.Worker, queue: :notifications

  alias Chironium.Mailer
  alias Chironium.Mailer.Renderer

  @impl true
  def perform(%Oban.Job{args: %{"type" => type, "params" => params}}) do
    email = build_email(type, params)

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
        accept_url: params["accept_url"]
      })

    {from_name, from_address} = from_address()

    Swoosh.Email.new()
    |> Swoosh.Email.to(params["email"])
    |> Swoosh.Email.from({from_name, from_address})
    |> Swoosh.Email.subject("You've been invited to #{params["organization_name"]}")
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

    Swoosh.Email.new()
    |> Swoosh.Email.to(params["email"])
    |> Swoosh.Email.from({from_name, from_address})
    |> Swoosh.Email.subject("Task reminder: #{params["task_description"]}")
    |> Swoosh.Email.html_body(html)
    |> Swoosh.Email.text_body(text)
  end

  defp from_address do
    config = Application.get_env(:chironium, :email_from, [])

    {Keyword.get(config, :name, "Chironium"),
     Keyword.get(config, :address, "chironium@updates.appfor.it")}
  end
end
