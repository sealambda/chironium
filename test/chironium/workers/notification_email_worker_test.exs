defmodule Chironium.Workers.NotificationEmailWorkerTest do
  use Chironium.DataCase, async: true
  use Oban.Testing, repo: Chironium.Repo

  import Swoosh.TestAssertions

  alias Chironium.Workers.NotificationEmailWorker

  describe "invitation_created" do
    test "builds and delivers an invitation email" do
      args = %{
        "type" => "invitation_created",
        "params" => %{
          "email" => "alice@example.com",
          "invited_by_name" => "Bob",
          "organization_name" => "Acme Corp",
          "accept_url" => "https://app.chironium.app/invitations/ABC123"
        }
      }

      assert :ok = perform_job(NotificationEmailWorker, args)

      assert_email_sent(
        to: [{"", "alice@example.com"}],
        subject: "You've been invited to Acme Corp"
      )
    end
  end

  describe "task_reminder" do
    test "builds and delivers a task reminder email" do
      args = %{
        "type" => "task_reminder",
        "params" => %{
          "email" => "dr.smith@example.com",
          "recipient_name" => "Dr. Smith",
          "task_description" => "Follow-up blood work",
          "task_priority" => "urgent",
          "patient_name" => "Jane Doe",
          "task_url" => "https://app.chironium.app/tasks/abc123"
        }
      }

      assert :ok = perform_job(NotificationEmailWorker, args)

      assert_email_sent(
        to: [{"", "dr.smith@example.com"}],
        subject: "Task reminder: Follow-up blood work"
      )
    end
  end
end
