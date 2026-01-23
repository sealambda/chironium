defmodule Chironium.Health.PathologyCategory do
  @moduledoc """
  Reference catalog of pathology categories for grouping medical conditions.

  Categories allow grouping pathologies by medical specialty or body system
  for better organization in the UI.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "pathology_categories"
    repo Chironium.Repo
  end

  actions do
    defaults [:read]

    create :create do
      accept [:code, :name, :description, :display_order]
    end

    update :update do
      accept [:name, :description, :display_order]
    end

    destroy :destroy
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :code, :string do
      allow_nil? false
      public? true
      constraints max_length: 50
      description "Unique code identifier (e.g., 'digestive', 'hormonal_gynecological')."
    end

    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 100
      description "Display name for the category."
    end

    attribute :description, :string do
      allow_nil? true
      public? true
      constraints max_length: 500
      description "Optional description of conditions included in this category."
    end

    attribute :display_order, :integer do
      allow_nil? false
      public? true
      default 0
      description "Order for displaying categories in the UI."
    end

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  identities do
    identity :unique_code, [:code]
  end
end
