defmodule Chironium.NotificationsTest do
  # The email flag is global application env.
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  alias Chironium.Notifications
  alias Chironium.Workers.NotificationEmailWorker

  @params %{
    email: "alice@example.com",
    invited_by_name: "Bob",
    organization_name: "Acme",
    code: "ABC",
    accept_url: "https://example.com/invite/ABC"
  }

  test "send/2 enqueues an email notification job" do
    assert Notifications.email_enabled?()
    assert :ok = Notifications.send(:invitation_created, @params)

    assert_enqueued(
      worker: NotificationEmailWorker,
      args: %{
        "type" => "invitation_created",
        "params" => %{
          "email" => "alice@example.com",
          "invited_by_name" => "Bob",
          "organization_name" => "Acme",
          "code" => "ABC",
          "accept_url" => "https://example.com/invite/ABC"
        }
      }
    )
  end

  test "send/2 enqueues nothing when email is off" do
    disable_email()

    refute Notifications.email_enabled?()
    assert :ok = Notifications.send(:invitation_created, @params)
    refute_enqueued(worker: NotificationEmailWorker)
  end
end
