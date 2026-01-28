defmodule Chironium.Core.Person do
  @moduledoc """
  Core identity for any individual in the system.

  Contains immutable personal identity data. All contact information
  (email, phone) is org-specific and stored in `PersonProfile`.

  ## Data Philosophy

  - **Person**: Pure identity (given_name, surnames, birth_date).
  - **PersonProfile**: Org-specific data (email, phone, display_name, gender).
  - **User**: Authentication tokens (email synced from PersonProfile on login).

  ## Authentication

  All auth (Google OAuth, Magic Link) looks up email via PersonProfile.
  This means a Person must have at least one PersonProfile to authenticate.

  ## Lifecycle

  A Person can exist without authentication (e.g., a lead created by staff).
  Authentication is granted via `User` when needed:
  - When a Contract is created with a PersonProfile (staff invite).
  - When a Membership needs onboarding (customer magic link).
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource]

  postgres do
    table "people"
    repo Chironium.Repo
  end

  graphql do
    type :person

    queries do
      read_one :person, :read
    end

    mutations do
      create :create_person, :create
      update :update_person, :update
    end
  end

  actions do
    defaults [:read]

    create :create do
      description "Creates a Person with provided data."

      accept [
        :given_name,
        :st_surname,
        :nd_surname,
        :birth_date
      ]
    end

    create :create_lead do
      description "Creates a minimal Person as a lead (no email required)."
      accept [:given_name, :st_surname]
    end

    create :create_from_auth do
      description "Creates a Person during authentication flow with OAuth data."
      argument :user_info, :map, allow_nil?: true

      change fn changeset, _ctx ->
        case Ash.Changeset.get_argument(changeset, :user_info) do
          nil ->
            changeset

          user_info ->
            changeset
            |> Ash.Changeset.change_attribute(:given_name, user_info["given_name"])
            |> Ash.Changeset.change_attribute(:st_surname, user_info["family_name"])
        end
      end
    end

    update :update do
      description "Updates a Person's personal data."
      require_atomic? false

      accept [
        :given_name,
        :st_surname,
        :nd_surname,
        :birth_date
      ]
    end
  end

  policies do
    # Bypass for authentication system interactions.
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end

    # Internal action for creating people during auth/contract flows.
    bypass action([:create, :create_lead, :create_from_auth]) do
      authorize_if always()
    end

    # Users can read their own person record.
    policy action_type(:read) do
      authorize_if expr(id == ^actor(:person_id))
    end

    # Users can update their own person record.
    policy action_type(:update) do
      authorize_if expr(id == ^actor(:person_id))
    end
  end

  attributes do
    uuid_v7_primary_key :id

    # Given/personal name (OIDC: given_name).
    attribute :given_name, :string do
      allow_nil? true
      public? true
      constraints max_length: 100
    end

    # First surname (paternal in Spanish naming).
    attribute :st_surname, :string do
      allow_nil? true
      public? true
      constraints max_length: 100
    end

    # Second surname (maternal in Spanish naming).
    attribute :nd_surname, :string do
      allow_nil? true
      public? true
      constraints max_length: 100
    end

    attribute :birth_date, :date do
      allow_nil? true
      public? true
    end

    create_timestamp :created_at, type: :utc_datetime_usec
    update_timestamp :updated_at, type: :utc_datetime_usec
  end

  relationships do
    # Optional 1:1 with User (auth). Person can exist without auth.
    has_one :user, Chironium.Core.Identity.User

    # Optional 1:1 with HealthProfile (biological/medical data).
    has_one :health_profile, Chironium.Health.HealthProfile

    # Per-organisation profile preferences.
    has_many :profiles, Chironium.Core.PersonProfile

    # Staff relationships with organisations.
    has_many :contracts, Chironium.Staff.Contract

    # Customer relationships with organisations.
    has_many :memberships, Chironium.Customers.Membership
  end

  calculations do
    calculate :full_name, :string, {Chironium.Core.Calculations.FullName, []}
    calculate :family_name, :string, {Chironium.Core.Calculations.FamilyName, []}
    calculate :age, :integer, {Chironium.Core.Calculations.Age, []}
    calculate :has_auth, :boolean, expr(not is_nil(user.id))
  end
end
