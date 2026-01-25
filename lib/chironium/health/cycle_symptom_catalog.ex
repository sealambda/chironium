defmodule Chironium.Health.CycleSymptomCatalog do
  @moduledoc """
  Reference catalog of menstrual cycle symptoms.

  Read-only reference data for common cycle symptoms.
  Used to track symptoms reported during menstrual cycles.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "cycle_symptom_catalog"
    repo Chironium.Repo
  end

  actions do
    defaults [:read]

    create :create do
      primary? true
      accept [:name, :description]
    end

    update :update do
      accept [:name, :description]
    end

    destroy :destroy
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 100
    end

    attribute :description, :string do
      allow_nil? true
      public? true
      constraints max_length: 500
    end

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  identities do
    identity :unique_name, [:name]
  end
end
