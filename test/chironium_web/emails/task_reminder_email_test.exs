defmodule ChironiumWeb.Emails.TaskReminderEmailTest do
  use ExUnit.Case, async: true

  alias Chironium.Mailer.Renderer

  test "renders task reminder email with all fields" do
    %{html: html, text: text} =
      Renderer.render(&ChironiumWeb.Emails.TaskReminderEmail.render/1, %{
        recipient_name: "Dr. Smith",
        task_description: "Follow-up blood work",
        task_priority: "urgent",
        patient_name: "Jane Doe",
        task_url: "https://app.chironium.app/tasks/abc123"
      })

    assert html =~ "Dr. Smith"
    assert html =~ "Follow-up blood work"
    assert html =~ "urgent"
    assert html =~ "Jane Doe"
    assert html =~ "https://app.chironium.app/tasks/abc123"
    assert html =~ "View task"
    assert html =~ "style="

    assert text =~ "Dr. Smith"
    assert text =~ "Follow-up blood work"
    assert text =~ "View task"
  end

  test "renders without optional fields" do
    %{html: html, text: text} =
      Renderer.render(&ChironiumWeb.Emails.TaskReminderEmail.render/1, %{
        recipient_name: "Dr. Smith",
        task_description: "Check vitals",
        task_url: "https://app.chironium.app/tasks/xyz"
      })

    assert html =~ "Check vitals"
    # Optional fields are not rendered.
    refute html =~ "Patient:"
    refute html =~ "Priority:"

    assert text =~ "Check vitals"
  end
end
