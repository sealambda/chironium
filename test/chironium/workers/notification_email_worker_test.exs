defmodule Chironium.Workers.NotificationEmailWorkerTest do
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Swoosh.TestAssertions

  alias Chironium.Workers.NotificationEmailWorker

  describe "invitation_created" do
    test "builds and delivers an invitation email in the specified locale" do
      args = %{
        "type" => "invitation_created",
        "params" => %{
          "email" => "alice@example.com",
          "invited_by_name" => "Bob",
          "organization_name" => "Acme Corp",
          "code" => "ABC123",
          "accept_url" => "https://app.chironium.app/invitations/ABC123",
          "locale" => "en"
        }
      }

      assert :ok = perform_job(NotificationEmailWorker, args)

      assert_email_sent(
        to: [{"", "alice@example.com"}],
        subject: "You've been invited to Acme Corp"
      )
    end

    test "defaults to English when no locale is provided" do
      args = %{
        "type" => "invitation_created",
        "params" => %{
          "email" => "alice@example.com",
          "invited_by_name" => "Bob",
          "organization_name" => "Acme Corp",
          "code" => "ABC123",
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
    test "builds and delivers a task reminder email in the specified locale" do
      args = %{
        "type" => "task_reminder",
        "params" => %{
          "email" => "dr.smith@example.com",
          "recipient_name" => "Dr. Smith",
          "task_description" => "Follow-up blood work",
          "task_priority" => "urgent",
          "patient_name" => "Jane Doe",
          "task_url" => "https://app.chironium.app/app/customers/abc123",
          "locale" => "en"
        }
      }

      assert :ok = perform_job(NotificationEmailWorker, args)

      assert_email_sent(
        to: [{"", "dr.smith@example.com"}],
        subject: "Task reminder: Follow-up blood work"
      )
    end

    test "defaults to English when no locale is provided" do
      args = %{
        "type" => "task_reminder",
        "params" => %{
          "email" => "dr.smith@example.com",
          "recipient_name" => "Dr. Smith",
          "task_description" => "Follow-up blood work",
          "task_priority" => "urgent",
          "patient_name" => "Jane Doe",
          "task_url" => "https://app.chironium.app/app/customers/abc123"
        }
      }

      assert :ok = perform_job(NotificationEmailWorker, args)

      assert_email_sent(
        to: [{"", "dr.smith@example.com"}],
        subject: "Task reminder: Follow-up blood work"
      )
    end
  end

  describe "with email off" do
    test "a job queued before email was turned off is cancelled and sends nothing" do
      args = %{
        "type" => "task_reminder",
        "params" => %{
          "email" => "ana@example.com",
          "recipient_name" => "Dr. Ana",
          "task_description" => "Call back",
          "patient_name" => "Luis",
          "task_url" => "https://example.com/app/customers/1",
          "locale" => "en"
        }
      }

      disable_email()

      assert {:cancel, _} = perform_job(NotificationEmailWorker, args)
      assert_no_email_sent()
    end
  end
end
