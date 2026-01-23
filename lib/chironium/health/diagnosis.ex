defmodule Chironium.Health.Diagnosis do
  @moduledoc """
  Records a diagnosis linking a customer to a pathology from the catalog.

  Validates that gender-specific pathologies match the customer's biological sex.
  For chronic conditions, no end date is expected.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "diagnoses"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read]

    update :update do
      require_atomic? false
    end
  end

  validations do
    validate {Chironium.Health.Validations.DiagnosisGenderScopeMatch, []}
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :diagnosis_date, :date do
      allow_nil? false
      public? true
    end

    attribute :end_date, :date do
      allow_nil? true
      public? true
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

    belongs_to :pathology, Chironium.Health.PathologyCatalog do
      allow_nil? false
      public? true
    end

    belongs_to :created_by, Chironium.Staff.Contract do
      allow_nil? false
      public? true
    end
  end
end
