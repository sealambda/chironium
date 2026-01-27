defmodule Chironium.Core.Identity.User do
  @moduledoc """
  Authentication user linked to a Person.

  This resource handles ONLY authentication concerns. Personal information
  is stored in the linked `Person` resource in the Core domain.

  ## Authentication Flow

  ### Google OAuth (Open Sign-up)

  Google OAuth allows anyone to sign up:
  1. Input email from Google → Check if PersonProfile exists with that email
  2. If PersonProfile exists → Use its Person
  3. If no PersonProfile → Check if User exists with that email
  4. If User exists → Use its Person
  5. If neither exists → Create new Person from Google profile data
  6. Get or create User for Person

  This means anyone can sign up via Google SSO, even without a PersonProfile.
  PersonProfiles are only created when invited to an organisation.

  ## Email Handling

  `User.email` stores the email used for the current/last authentication.
  It's synced from the auth email on each login. For users with PersonProfiles,
  the canonical emails are in PersonProfile - a Person can have multiple valid
  auth emails across different organisations.

  ## Actor Pattern

  `User` is the authenticated actor. Access `Person` via the relationship
  for personal data: `user.person` or `actor(:person_id)` in policies.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core.Identity,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshAuthentication,
      AshPaperTrail.Resource,
      AshRateLimiter,
      AshGraphql.Resource
    ]

  import Ash.Expr
  require Ash.Query

  authentication do
    add_ons do
      log_out_everywhere do
        apply_on_password_change? true
      end
    end

    tokens do
      enabled? true
      token_resource Chironium.Core.Identity.Token
      signing_secret Chironium.Secrets
      store_all_tokens? true
      require_token_presence_for_authentication? true
    end

    strategies do
      google do
        client_id Chironium.Secrets
        client_secret Chironium.Secrets
        redirect_uri Chironium.Secrets
        identity_resource Chironium.Core.Identity.UserIdentity
      end
    end
  end

  postgres do
    table "users"
    repo Chironium.Repo
  end

  paper_trail do
    # Track who made changes to User records.
    belongs_to_actor(:changed_by, Chironium.Core.Identity.User, domain: Chironium.Core.Identity)

    # Ignore timestamps to reduce noise.
    ignore_attributes([:created_at, :updated_at])

    # Store which action caused the change.
    store_action_name?(true)

    # Full diff shows before/after values.
    change_tracking_mode(:full_diff)

    # Use UUIDv7 for version primary keys.
    primary_key_type :uuid_v7
  end

  graphql do
    type :user

    queries do
      read_one :user, :read
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

    create :create_for_person do
      description "Creates a user for an existing Person (internal use)."
      accept [:person_id]
      argument :email, :string, allow_nil?: false

      change fn changeset, _ctx ->
        email = Ash.Changeset.get_argument(changeset, :email)
        normalized = email |> String.trim() |> String.downcase()
        Ash.Changeset.change_attribute(changeset, :email, normalized)
      end
    end

    create :register_with_google do
      description "Registers or signs in via Google OAuth. Open sign-up - creates Person if needed."
      argument :user_info, :map, allow_nil?: false
      argument :oauth_tokens, :map, allow_nil?: false
      upsert? true
      upsert_identity :unique_email

      change AshAuthentication.GenerateTokenChange
      change AshAuthentication.Strategy.OAuth2.IdentityChange
      change &link_or_create_person_for_google/2
    end

    update :update_email do
      description "Updates the user's login email (synced from PersonProfile on auth)."
      accept [:email]
      require_atomic? false

      change fn changeset, _ctx ->
        case Ash.Changeset.get_attribute(changeset, :email) do
          nil ->
            changeset

          email when is_binary(email) ->
            normalized = email |> String.trim() |> String.downcase()
            Ash.Changeset.change_attribute(changeset, :email, normalized)

          _ ->
            changeset
        end
      end
    end
  end

  policies do
    # Allow AshAuthentication to perform its operations.
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end

    # Internal action for creating users when inviting staff.
    bypass action(:create_for_person) do
      authorize_if always()
    end

    # Internal action for syncing email on login.
    bypass action(:update_email) do
      authorize_if always()
    end
  end

  attributes do
    uuid_v7_primary_key :id

    # Login email (synced from PersonProfile on auth).
    attribute :email, :ci_string do
      allow_nil? false
      public? true
      constraints casing: :lower
    end

    create_timestamp :created_at, type: :utc_datetime_usec
    update_timestamp :updated_at, type: :utc_datetime_usec
  end

  relationships do
    has_many :identities, Chironium.Core.Identity.UserIdentity do
      destination_attribute :user_id
    end

    belongs_to :person, Chironium.Core.Person do
      allow_nil? false
      public? true
      attribute_public? false
    end
  end

  identities do
    identity :unique_email, [:email]
    identity :unique_person, [:person_id]
  end

  # Links to existing Person via PersonProfile email or existing User email,
  # or creates a new Person if neither exists (open sign-up via Google).
  defp link_or_create_person_for_google(changeset, _ctx) do
    user_info = Ash.Changeset.get_argument(changeset, :user_info) || %{}
    email = normalize_email(user_info["email"])

    if email == "" do
      Ash.Changeset.add_error(changeset,
        field: :email,
        message: "is required to sign in"
      )
    else
      changeset = Ash.Changeset.change_attribute(changeset, :email, email)

      # Priority 1: Find existing Person via PersonProfile email.
      with {:error, :not_found} <- find_person_by_profile_email(email),
           # Priority 2: Find existing Person via User email (returning user).
           {:error, :not_found} <- find_person_by_user_email(email) do
        # Priority 3: Create new Person from Google profile (open sign-up).
        create_person_for_google_signup(changeset, user_info)
      else
        {:ok, person} ->
          Ash.Changeset.change_attribute(changeset, :person_id, person.id)

        error ->
          Ash.Changeset.add_error(changeset,
            field: :person_id,
            message: "failed to find or create person: #{inspect(error)}"
          )
      end
    end
  end

  # Creates a new Person from Google profile data during open sign-up.
  defp create_person_for_google_signup(changeset, user_info) do
    case Chironium.Core.Person
         |> Ash.Changeset.for_create(:create_from_auth, %{user_info: user_info})
         |> Ash.create(authorize?: false) do
      {:ok, person} ->
        Ash.Changeset.change_attribute(changeset, :person_id, person.id)

      {:error, error} ->
        Ash.Changeset.add_error(changeset,
          field: :person_id,
          message: "failed to create person: #{inspect(error)}"
        )
    end
  end

  defp find_person_by_profile_email(search_email) do
    Chironium.Core.PersonProfile
    |> Ash.Query.filter(expr(email == ^search_email))
    |> Ash.Query.load(:person)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> {:error, :not_found}
      {:ok, profile} -> {:ok, profile.person}
      error -> error
    end
  end

  defp find_person_by_user_email(search_email) do
    __MODULE__
    |> Ash.Query.filter(expr(email == ^search_email))
    |> Ash.Query.load(:person)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> {:error, :not_found}
      {:ok, user} -> {:ok, user.person}
      error -> error
    end
  end

  defp normalize_email(nil), do: ""

  defp normalize_email(email) when is_binary(email),
    do: email |> String.trim() |> String.downcase()

  defp normalize_email(_), do: ""
end
