defmodule Chironium.Accounts.User do
  @moduledoc """
  User resource representing an authenticated user.

  Profile fields (`name`, `given_name`, `family_name`, `picture`) are populated from
  Google OpenID Connect claims during OAuth authentication.

  **Important**: None of these profile claims are guaranteed to be present.
  Only the `email` field is reliably provided when the `email` scope is requested.

  See: https://developers.google.com/identity/openid-connect/openid-connect#an-id-tokens-payload
  """

  use Chironium.BaseResources.Auditable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshAuthentication,
      AshPaperTrail.Resource,
      AshRateLimiter,
      AshGraphql.Resource,
      AshAdmin.Resource
    ]

  admin do
    actor? true
  end

  authentication do
    add_ons do
      log_out_everywhere do
        apply_on_password_change? true
      end
    end

    tokens do
      enabled? true
      token_resource Chironium.Accounts.Token
      signing_secret Chironium.Secrets
      store_all_tokens? true
      require_token_presence_for_authentication? true
    end

    strategies do
      google do
        client_id Chironium.Secrets
        client_secret Chironium.Secrets
        redirect_uri Chironium.Secrets
        identity_resource Chironium.Accounts.UserIdentity
      end
    end
  end

  postgres do
    table "users"
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:user]}
  end

  graphql do
    type :user

    queries do
      read_one :get_user, :read
    end
  end

  actions do
    defaults [:read]

    read :get_by_subject do
      description "Get a user by the subject claim in a JWT."
      argument :subject, :string, allow_nil?: false
      get? true
      prepare AshAuthentication.Preparations.FilterBySubject
    end

    read :get_by_email do
      description "Looks up a user by email."
      get_by :email
    end

    create :register_with_google do
      description "Registers or signs in via Google OAuth."
      argument :user_info, :map, allow_nil?: false
      argument :oauth_tokens, :map, allow_nil?: false
      upsert? true
      upsert_identity :unique_email

      change AshAuthentication.GenerateTokenChange
      change AshAuthentication.Strategy.OAuth2.IdentityChange

      change fn changeset, _ ->
        user_info = Ash.Changeset.get_argument(changeset, :user_info)

        Ash.Changeset.change_attributes(
          changeset,
          Map.take(user_info, ["email", "picture", "name", "family_name", "given_name"])
        )
      end
    end
  end

  policies do
    # Allow AshAuthentication to perform its operations.
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end
  end

  multitenancy do
    global? true
  end

  attributes do
    attribute :email, :ci_string do
      allow_nil? false
      public? true
      constraints casing: :lower
    end

    attribute :picture, :string do
      public? true

      description """
      The URL of the user's profile picture. Might be provided when:
      - The request scope included the string "profile".
      - The ID token is returned from a token refresh.
      Note: This claim is never guaranteed to be present.
      """
    end

    attribute :name, :string do
      public? true

      description """
      The user's full name, in a displayable form. Might be provided when:
      - The request scope included the string "profile".
      - The ID token is returned from a token refresh.
      Note: This claim is never guaranteed to be present.
      """
    end

    attribute :family_name, :string do
      public? true

      description """
      The user's surname(s) or last name(s).
      Might be provided when a name claim is present.
      """
    end

    attribute :given_name, :string do
      public? true

      description """
      The user's given name(s) or first name(s).
      Might be provided when a name claim is present.
      """
    end
  end

  relationships do
    has_many :identities, Chironium.Accounts.UserIdentity
  end

  identities do
    identity :unique_email, [:email]
  end
end
