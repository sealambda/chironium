defmodule ChironiumWeb.Emails.TaskReminderEmail do
  @moduledoc """
  Email sent to remind practitioners about upcoming tasks.
  """

  use Phoenix.Component
  use Gettext, backend: ChironiumWeb.Gettext

  import ChironiumWeb.Emails.Components

  attr :recipient_name, :string, required: true
  attr :task_description, :string, required: true
  attr :task_priority, :string, default: nil
  attr :patient_name, :string, default: nil
  attr :task_url, :string, required: true

  def render(assigns) do
    ~H"""
    <.email_layout>
      <h1 class="email-heading">
        {dgettext("emails", "Task reminder")}
      </h1>
      <p class="email-text">
        {dgettext("emails", "Hi %{name}, you have an upcoming task.", name: @recipient_name)}
      </p>
      <table
        role="presentation"
        cellpadding="0"
        cellspacing="0"
        style="width: 100%; margin-bottom: 16px;"
      >
        <tr>
          <td style="padding: 12px 16px; background-color: #f4f4f5; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #18181b;">{@task_description}</p>
            <p :if={@patient_name} style="margin: 0 0 4px; font-size: 14px; color: #3f3f46;">
              {dgettext("emails", "Patient: %{name}", name: @patient_name)}
            </p>
            <p :if={@task_priority} style="margin: 0; font-size: 14px; color: #71717a;">
              {dgettext("emails", "Priority: %{priority}", priority: @task_priority)}
            </p>
          </td>
        </tr>
      </table>
      <.email_button href={@task_url}>
        {dgettext("emails", "View task")}
      </.email_button>
    </.email_layout>
    """
  end
end
