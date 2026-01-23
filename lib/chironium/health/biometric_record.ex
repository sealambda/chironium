defmodule Chironium.Health.BiometricRecord do
  @moduledoc """
  Records weight, height, and body measurements for a customer.

  Can be recorded by the customer or a staff member, with optional validation.
  Includes a calculated BMI field.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "biometric_records"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read, :update]
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

    attribute :recorded_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    attribute :weight_kg, :decimal do
      allow_nil? false
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0"), max: Decimal.new("500")
    end

    attribute :height_cm, :decimal do
      allow_nil? false
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0"), max: Decimal.new("300")
    end

    attribute :measurements, Chironium.Health.Embeds.BodyMeasurements do
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

    belongs_to :validated_by, Chironium.Staff.Contract do
      allow_nil? true
      public? true
    end
  end

  calculations do
    calculate :bmi, :decimal, {Chironium.Health.Calculations.Bmi, []}
    calculate :bmr, :decimal, {Chironium.Health.Calculations.Bmr, []}
  end
end
