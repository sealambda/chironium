defmodule Chironium.Health.Embeds.BodyMeasurements do
  @moduledoc """
  Embedded resource for body measurements in centimeters.

  All measurements are optional and stored with 2 decimal precision.
  """
  use Ash.Resource, data_layer: :embedded

  attributes do
    attribute :waist_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :hip_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :chest_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :thigh_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :arm_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :neck_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end

    attribute :calf_cm, :decimal do
      allow_nil? true
      public? true
      constraints precision: 5, scale: 2, min: Decimal.new("0")
    end
  end
end
