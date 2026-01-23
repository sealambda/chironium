defmodule Chironium.Health.MenstrualCycle do
  @moduledoc """
  Tracks menstrual cycle data for female customers.

  Records cycle dates, flow levels, and symptoms. Only available for
  users with biological_sex set to FEMALE in their HealthProfile.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "menstrual_cycles"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read]

    update :update do
      require_atomic? false
    end
  end

  validations do
    validate {Chironium.Health.Validations.MenstrualCycleFemaleOnly, []}
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :recorded_by, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:CUSTOMER, :STAFF]
    end

    attribute :record_status, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:PENDING_VALIDATION, :VALIDATED]
    end

    attribute :validated_at, :utc_datetime_usec do
      allow_nil? true
      public? true
    end

    attribute :start_date, :date do
      allow_nil? false
      public? true
    end

    attribute :end_date, :date do
      allow_nil? true
      public? true
    end

    attribute :flow_level, :atom do
      allow_nil? true
      public? true
      constraints one_of: [:LIGHT, :MEDIUM, :HEAVY, :VERY_HEAVY]
    end

    attribute :notes, :string do
      allow_nil? true
      public? true
      constraints max_length: 2000
    end

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :assignment, Chironium.Services.Assignment do
      allow_nil? false
      public? true
    end

    belongs_to :validated_by, Chironium.Staff.Contract do
      allow_nil? true
      public? true
    end

    has_many :symptom_records, Chironium.Health.CycleSymptomRecord do
      public? true
    end
  end
end
