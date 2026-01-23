defmodule Chironium.Health.CycleSymptomRecord do
  @moduledoc """
  Records a symptom linked to a menstrual cycle.

  Links symptoms from the catalog to specific cycle records.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "cycle_symptom_records"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read, :destroy]
  end

  attributes do
    uuid_v7_primary_key :id

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :menstrual_cycle, Chironium.Health.MenstrualCycle do
      allow_nil? false
      public? true
    end

    belongs_to :symptom, Chironium.Health.CycleSymptomCatalog do
      allow_nil? false
      public? true
    end
  end
end
