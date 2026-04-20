defmodule Chironium.Accounts.InvitationLocaleTest do
  @moduledoc """
  Tests the locale resolution logic in the invitation creation flow.

  When an invitation is created, the notification email locale is resolved as:
  1. Use the invitee's preferred_locale when they already exist on the platform.
  2. Fall back to the organization's preferred_locale for unknown recipients.
  3. Default to "en" when neither the user nor the org specifies a locale.
  """
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  require Ash.Query

  import Chironium.Generator

  alias Chironium.Workers.NotificationEmailWorker

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))

    %{owner: owner, organization: organization}
  end

  describe "invitation locale resolution" do
    test "uses the existing user's preferred locale", ctx do
      # The invitee exists and prefers Spanish.
      invitee = generate(user())

      Ash.Changeset.for_update(invitee, :update_preferred_locale, %{preferred_locale: "es"},
        authorize?: false
      )
      |> Ash.update!()

      create_invitation(ctx, invitee.email)

      assert_enqueued(
        worker: NotificationEmailWorker,
        args: %{
          "type" => "invitation_created",
          "params" => %{"locale" => "es", "email" => to_string(invitee.email)}
        }
      )
    end

    test "falls back to the organization's preferred locale for unknown recipients", ctx do
      # Set the org locale to Spanish.
      Ash.Changeset.for_update(ctx.organization, :update, %{preferred_locale: "es"},
        authorize?: false
      )
      |> Ash.update!()

      unknown_email = "nobody-#{System.unique_integer([:positive])}@example.com"
      create_invitation(ctx, unknown_email)

      assert_enqueued(
        worker: NotificationEmailWorker,
        args: %{
          "type" => "invitation_created",
          "params" => %{"locale" => "es", "email" => unknown_email}
        }
      )
    end

    test "defaults to English when the org has the default locale and the user is unknown", ctx do
      # Organization has the default preferred_locale ("en"), invitee doesn't exist.
      unknown_email = "stranger-#{System.unique_integer([:positive])}@example.com"
      create_invitation(ctx, unknown_email)

      assert_enqueued(
        worker: NotificationEmailWorker,
        args: %{
          "type" => "invitation_created",
          "params" => %{"locale" => "en", "email" => unknown_email}
        }
      )
    end

    test "user locale takes precedence over the organization locale", ctx do
      # Org prefers Spanish, but the invitee explicitly chose English.
      Ash.Changeset.for_update(ctx.organization, :update, %{preferred_locale: "es"},
        authorize?: false
      )
      |> Ash.update!()

      invitee = generate(user())

      # User's default is "en"; verify it wins over the org's "es".
      create_invitation(ctx, invitee.email)

      assert_enqueued(
        worker: NotificationEmailWorker,
        args: %{
          "type" => "invitation_created",
          "params" => %{"locale" => "en", "email" => to_string(invitee.email)}
        }
      )
    end
  end

  # Creates an invitation through the Organization's :invite_users action,
  # which triggers the full after_action chain including locale resolution.
  defp create_invitation(ctx, email) do
    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: email, role: :member}]},
      actor: ctx.owner
    )
    |> Ash.update!()
  end
end
