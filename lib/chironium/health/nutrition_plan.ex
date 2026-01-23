defmodule Chironium.Health.NutritionPlan do
  @moduledoc """
  Defines a nutrition plan with macro targets for a customer.

  Validates that protein, carbs, and fats sum to approximately
  the target calories (within 50 kcal tolerance).
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "nutrition_plans"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read]

    update :update do
      require_atomic? false
    end
  end

  validations do
    validate {Chironium.Health.Validations.MacroCalorieBalance, []}
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :start_date, :date do
      allow_nil? false
      public? true
    end

    attribute :end_date, :date do
      allow_nil? true
      public? true
    end

    attribute :target_kcals, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 10_000
    end

    attribute :protein_gr, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 1000
    end

    attribute :fats_gr, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 1000
    end

    attribute :carbs_gr, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 2000
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

    belongs_to :created_by, Chironium.Staff.Contract do
      allow_nil? false
      public? true
    end
  end
end
