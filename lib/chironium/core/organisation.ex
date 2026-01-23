defmodule Chironium.Core.Organisation do
  @moduledoc """
  Represents a business organisation in the system.

  Organisations are the top-level tenant entity. Users belong to organisations
  through memberships (customers) or contracts (staff).
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "organisations"
    repo Chironium.Repo
  end

  actions do
    defaults [:create, :read, :update, :destroy]
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 200
    end

    attribute :slug, :ci_string do
      allow_nil? false
      public? true
      constraints match: ~r/^[a-z0-9]+(-[a-z0-9]+)*$/, casing: :lower
    end

    attribute :profile_picture, :string do
      allow_nil? true
      public? true
      constraints match: ~r/^https?:\/\/.+/
    end

    attribute :theme_seed_color, :string do
      allow_nil? true
      public? true
      constraints match: ~r/^#[0-9A-Fa-f]{6}$/
    end

    create_timestamp :created_at, type: :utc_datetime_usec
    update_timestamp :updated_at, type: :utc_datetime_usec
  end

  relationships do
    has_many :memberships, Chironium.Customers.Membership
    has_many :contracts, Chironium.Staff.Contract
  end

  identities do
    identity :unique_slug, [:slug]
  end
end
