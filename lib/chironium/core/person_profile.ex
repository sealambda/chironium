defmodule Chironium.Core.PersonProfile do
  @moduledoc """
  Per-organisation profile preferences for a Person.

  Allows a person to have different display names, contact info, and
  preferences for each organisation they belong to.

  ## Examples

  - User "María García" in Gym A: display_name "Mari", email: "mari@gym.com"
  - Same user in Clinic B: display_name "María", email: "maria.garcia@clinic.com"

  ## Fallback Behavior

  When a profile field is nil, the system should fall back to Person's primary data.
  Use the `effective_*` calculations for this behavior.

  ## Multitenancy

  This resource is tenant-scoped by `organisation_id`. When a tenant is set,
  queries are automatically filtered to that organisation.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource]

  postgres do
    table "person_profiles"
    repo Chironium.Repo

    references do
      reference :person, on_delete: :delete
      reference :organisation, on_delete: :delete
    end

    # SQL translation for partial unique index on email.
    identity_wheres_to_sql unique_email: "(email IS NOT NULL)"
  end

  graphql do
    type :person_profile

    queries do
      read_one :person_profile, :read
      list :person_profiles, :read
    end

    mutations do
      create :create_person_profile, :create
      update :update_person_profile, :update
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      description "Creates a profile for a person in an organisation."

      accept [
        :person_id,
        :organisation_id,
        :display_name,
        :gender,
        :email,
        :phone,
        :profile_picture,
        :country,
        :city,
        :post_code,
        :notes
      ]
    end

    update :update do
      description "Updates profile preferences."

      accept [
        :display_name,
        :gender,
        :email,
        :phone,
        :profile_picture,
        :country,
        :city,
        :post_code,
        :notes
      ]
    end
  end

  policies do
    # Users can read/update their own profile.
    policy action_type(:read) do
      authorize_if expr(person_id == ^actor(:person_id))
    end

    policy action_type(:update) do
      authorize_if expr(person_id == ^actor(:person_id))
    end

    # Staff with management role can read/update profiles in their org.
    policy action_type(:read) do
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    policy action_type(:update) do
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end
  end

  multitenancy do
    strategy :attribute
    attribute :organisation_id
    global? true
  end

  attributes do
    uuid_v7_primary_key :id

    # Preferred display name for this org (nickname, preferred name).
    attribute :display_name, :string do
      allow_nil? true
      public? true
      constraints max_length: 100
    end

    # Gender identity for this org (preference-based, not biological).
    attribute :gender, :atom do
      allow_nil? true
      public? true
      constraints one_of: [:MALE, :FEMALE, :NON_BINARY, :OTHER, :PREFER_NOT_TO_SAY]
    end

    # Org-specific contact email.
    attribute :email, :ci_string do
      allow_nil? true
      public? true
      constraints casing: :lower
    end

    # Org-specific contact phone.
    attribute :phone, :string do
      allow_nil? true
      public? true
      constraints match: ~r/^\+[1-9]\d{1,14}$/
    end

    # Org-specific avatar.
    attribute :profile_picture, :string do
      allow_nil? true
      public? true
      constraints match: ~r/^https?:\/\/.+/
    end

    # Org-specific address.
    attribute :country, :string do
      allow_nil? true
      public? true
      constraints min_length: 2, max_length: 2
    end

    attribute :city, :string do
      allow_nil? true
      public? true
      constraints max_length: 100
    end

    attribute :post_code, :string do
      allow_nil? true
      public? true
      constraints max_length: 20
    end

    # Internal notes about this person (visible to org staff only).
    attribute :notes, :string do
      allow_nil? true
      public? false
      constraints max_length: 5000
    end

    create_timestamp :created_at, type: :utc_datetime_usec
    update_timestamp :updated_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :person, Chironium.Core.Person do
      allow_nil? false
      public? true
    end

    belongs_to :organisation, Chironium.Core.Organisation do
      allow_nil? false
      public? true
    end
  end

  calculations do
    # Effective display name (profile display_name or fallback to given_name).
    calculate :effective_display_name, :string, expr(display_name || person.given_name)
  end

  identities do
    # One profile per person per organisation.
    identity :unique_person_org, [:person_id, :organisation_id]

    # Email must be unique across all profiles (for auth lookup).
    identity :unique_email, [:email], where: expr(not is_nil(email))
  end
end
