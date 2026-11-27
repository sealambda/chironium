defmodule Chironium.Workers.NotificationEmailWorkerTest do
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.Generator
  import Swoosh.TestAssertions

  alias Chironium.Workers.NotificationEmailWorker

  describe "invitation_created" do
    setup do
      owner = generate(user())
      organization = generate(organization(actor: owner))

      invitation =
        generate(invitation(organization_id: organization.id, invited_by_id: owner.id))

      %{invitation: invitation}
    end

    defp invitation_args(invitation, extra \\ %{}) do
      %{
        "type" => "invitation_created",
        "params" =>
          Map.merge(
            %{
              "email" => "alice@example.com",
              "invited_by_name" => "Bob",
              "organization_name" => "Acme Corp",
              "invitation_id" => invitation.id
            },
            extra
          )
      }
    end

    test "builds and delivers an invitation email with the current code", %{
      invitation: invitation
    } do
      assert :ok =
               perform_job(
                 NotificationEmailWorker,
                 invitation_args(invitation, %{"locale" => "en"})
               )

      assert_email_sent(fn email ->
        assert email.to == [{"", "alice@example.com"}]
        assert email.subject == "You've been invited to Acme Corp"
        assert email.text_body =~ to_string(invitation.invite_code)
      end)
    end

    test "defaults to English when no locale is provided", %{invitation: invitation} do
      assert :ok = perform_job(NotificationEmailWorker, invitation_args(invitation))

      assert_email_sent(subject: "You've been invited to Acme Corp")
    end

    test "cancels when the invitation is no longer pending", %{invitation: invitation} do
      Ash.Seed.update!(invitation, %{expires_at: DateTime.add(DateTime.utc_now(), -1, :day)})

      assert {:cancel, _} = perform_job(NotificationEmailWorker, invitation_args(invitation))
      assert_no_email_sent()
    end

    test "cancels a job queued with the code instead of the invitation ID" do
      args = %{
        "type" => "invitation_created",
        "params" => %{"email" => "alice@example.com", "code" => "ABC123"}
      }

      assert {:cancel, _} = perform_job(NotificationEmailWorker, args)
      assert_no_email_sent()
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
