defmodule Chironium.Core.Identity.AuthEvent do
  @moduledoc """
  Audit log for authentication events.

  Tracks authentication actions not captured by Paper Trail CRUD operations,
  such as logins, logouts, token revocations, and account merges.

  ## Event Types

  - `:login_google` - Google OAuth sign-in.
  - `:login_magic_link` - Magic link sign-in.
  - `:logout` - User sign-out.
  - `:token_revoked` - Individual token revoked.
  - `:all_tokens_revoked` - All user tokens revoked.
  - `:account_merge_initiated` - Account merge request created.
  - `:account_merge_completed` - Account merge finalized.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core.Identity,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "auth_events"
    repo Chironium.Repo
  end

  actions do
    defaults [:read]

    create :log do
      description "Log an authentication event."
      accept [:event_type, :user_id, :person_id, :ip_address, :user_agent, :metadata]
    end

    read :recent_for_user do
      description "Get recent auth events for a user."
      argument :user_id, :uuid, allow_nil?: false
      argument :limit, :integer, default: 50

      filter expr(user_id == ^arg(:user_id))
      prepare build(sort: [occurred_at: :desc], limit: arg(:limit))
    end
  end

  policies do
    # Only allow internal/system creation.
    bypass action(:log) do
      description "Internal action for logging auth events."
      authorize_if always()
    end

    # Users can read their own auth events.
    policy action_type(:read) do
      description "Users can read their own auth events."
      authorize_if expr(user_id == ^actor(:id))
    end
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :event_type, :atom do
      allow_nil? false
      public? true

      constraints one_of: [
                    :login_google,
                    :login_magic_link,
                    :logout,
                    :token_revoked,
                    :all_tokens_revoked,
                    :account_merge_initiated,
                    :account_merge_completed
                  ]
    end

    attribute :ip_address, :string do
      allow_nil? true
      public? true
    end

    attribute :user_agent, :string do
      allow_nil? true
      public? true
    end

    attribute :metadata, :map do
      allow_nil? true
      public? true
      default %{}
      description "Additional context (e.g., merge request ID, token purpose)."
    end

    create_timestamp :occurred_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :user, Chironium.Core.Identity.User do
      allow_nil? true
      public? true
      description "The user who triggered or was affected by the event."
    end

    belongs_to :person, Chironium.Core.Person do
      allow_nil? true
      public? true
      description "The person associated with the event (for pre-User events)."
    end
  end
end
