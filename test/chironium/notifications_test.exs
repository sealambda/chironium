defmodule Chironium.NotificationsTest do
  use Chironium.DataCase, async: true
  use Oban.Testing, repo: Chironium.Repo

  alias Chironium.Notifications
  alias Chironium.Workers.NotificationEmailWorker

  test "send/2 enqueues an email notification job" do
    Notifications.send(:invitation_created, %{
      email: "alice@example.com",
      invited_by_name: "Bob",
      organization_name: "Acme",
      accept_url: "https://example.com/invite/ABC"
    })

    assert_enqueued(
      worker: NotificationEmailWorker,
      args: %{
        "type" => "invitation_created",
        "params" => %{
          "email" => "alice@example.com",
          "invited_by_name" => "Bob",
          "organization_name" => "Acme",
          "accept_url" => "https://example.com/invite/ABC"
        }
      }
    )
  end
end
