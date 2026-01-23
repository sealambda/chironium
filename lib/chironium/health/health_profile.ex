defmodule Chironium.Health.HealthProfile do
  @moduledoc """
  Biological health profile for a person.

  Stores biological/medical data that differs from gender identity stored
  in Core.Person. This includes:
  - `biological_sex`: The biological sex (MALE, FEMALE, INTERSEX) used for
    medical considerations like gender-specific pathologies and menstrual tracking.
  - `blood_type`: Blood type for medical records.
  - `medical_notes`: General medical notes.

  ## Design Rationale

  Gender identity (Core.Person.gender) represents how a person identifies,
  while biological sex (Health.HealthProfile.biological_sex) represents
  physiological characteristics needed for medical accuracy.

  This separation allows:
  - CRM to use gender identity for communication/personalization
  - Health domain to use biological sex for accurate medical validation
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "health_profiles"
    repo Chironium.Repo

    references do
      reference :person, on_delete: :delete
    end
  end

  actions do
    defaults [:read]

    create :create do
      description "Creates a health profile for a person."
      accept [:person_id, :biological_sex, :blood_type, :medical_notes]
    end

    update :update do
      description "Updates a health profile."
      require_atomic? false
      accept [:biological_sex, :blood_type, :medical_notes]
    end
  end

  policies do
    # Users can read their own health profile.
    policy action_type(:read) do
      authorize_if expr(person_id == ^actor(:person_id))
    end

    # Staff with management role can read health profiles.
    policy action_type(:read) do
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # Users can update their own health profile.
    policy action_type(:update) do
      authorize_if expr(person_id == ^actor(:person_id))
    end

    # Staff with management role can update health profiles.
    policy action_type(:update) do
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # Only staff can create health profiles.
    policy action_type(:create) do
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end
  end

  attributes do
    uuid_v7_primary_key :id

    # Biological sex for medical purposes (differs from gender identity).
    attribute :biological_sex, :atom do
      allow_nil? true
      public? true
      constraints one_of: [:MALE, :FEMALE, :INTERSEX]
    end

    attribute :blood_type, :atom do
      allow_nil? true
      public? true

      constraints one_of: [
                    :A_POSITIVE,
                    :A_NEGATIVE,
                    :B_POSITIVE,
                    :B_NEGATIVE,
                    :AB_POSITIVE,
                    :AB_NEGATIVE,
                    :O_POSITIVE,
                    :O_NEGATIVE
                  ]
    end

    attribute :medical_notes, :string do
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
  end

  identities do
    # One health profile per person.
    identity :unique_person, [:person_id]
  end
end
