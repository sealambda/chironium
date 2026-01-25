defmodule Chironium.Health.PathologyCatalog do
  @moduledoc """
  Reference catalog of medical pathologies/conditions.

  Read-only reference data with ICD codes, gender scope, and chronic flags.
  Used to validate diagnoses against patient's biological sex. Pathologies are
  grouped by category (via PathologyCategory) for UI organization.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "pathology_catalog"
    repo Chironium.Repo
  end

  actions do
    defaults [:read]

    create :create do
      primary? true
      accept [:name, :icd_code, :gender_scope, :is_chronic, :description]
      argument :category_id, :uuid, allow_nil?: false

      change manage_relationship(:category_id, :category, type: :append)
    end

    update :update do
      accept [:name, :icd_code, :gender_scope, :is_chronic, :description]
      argument :category_id, :uuid
      # Relationship management requires multiple DB operations.
      require_atomic? false

      change manage_relationship(:category_id, :category, type: :append)
    end

    destroy :destroy
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 200
    end

    attribute :icd_code, :string do
      allow_nil? true
      public? true
      constraints max_length: 10
    end

    attribute :gender_scope, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:MALE_ONLY, :FEMALE_ONLY, :BOTH]
    end

    attribute :is_chronic, :boolean do
      allow_nil? false
      public? true
      default false
    end

    attribute :description, :string do
      allow_nil? true
      public? true
      constraints max_length: 2000
    end

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :category, Chironium.Health.PathologyCategory do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_name, [:name]
  end
end
