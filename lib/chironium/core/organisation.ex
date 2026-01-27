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
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource]

  import Ash.Expr
  require Ash.Query

  postgres do
    table "organisations"
    repo Chironium.Repo
  end

  graphql do
    type :organisation
    derive_filter? false
    derive_sort? false

    queries do
      read_one :organisation, :by_unique

      list :organisations, :accessible do
        paginate_with nil
      end
    end

    mutations do
      create :create_organisation, :create
    end
  end

  actions do
    defaults [:update, :destroy]

    create :create do
      description "Creates a new organisation."
      accept [:name, :slug, :profile_picture, :theme_seed_color]
      change &attach_owner_contract/2
    end

    read :read do
      description "Primary read action for relationship loading."
      primary? true
    end

    read :by_unique do
      description "Get a single organisation by unique identifier (id, name, or slug)."
      argument :id, :uuid, allow_nil?: true
      argument :name, :string, allow_nil?: true
      argument :slug, :ci_string, allow_nil?: true
      get? true

      filter expr(
               (not is_nil(^arg(:id)) and id == ^arg(:id)) or
                 (not is_nil(^arg(:name)) and name == ^arg(:name)) or
                 (not is_nil(^arg(:slug)) and slug == ^arg(:slug))
             )

      prepare fn query, ctx ->
        import Ash.Expr

        case ctx.actor do
          %{person_id: actor_person_id} when not is_nil(actor_person_id) ->
            Ash.Query.filter(
              query,
              expr(
                exists(
                  contracts,
                  person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED]
                ) or
                  exists(
                    memberships,
                    person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED]
                  )
              )
            )

          _ ->
            Ash.Query.filter(query, expr(false))
        end
      end
    end

    read :accessible do
      description "Returns organisations the actor can access."

      prepare fn query, ctx ->
        import Ash.Expr

        case ctx.actor do
          %{person_id: actor_person_id} when not is_nil(actor_person_id) ->
            query
            |> Ash.Query.filter(
              expr(
                exists(
                  contracts,
                  person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED]
                ) or
                  exists(
                    memberships,
                    person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED]
                  )
              )
            )
            |> Ash.Query.sort(name: :asc_nils_last)

          _ ->
            Ash.Query.filter(query, expr(false))
        end
      end
    end
  end

  policies do
    # Authenticated users can create organisations.
    policy action(:create) do
      description "Authenticated users can create organisations."
      authorize_if actor_present()
    end

    # Owners or managers can update or destroy organisations.
    policy action([:update, :destroy]) do
      description "Only org owners or managers can modify organisations."

      authorize_if expr(
                     exists(
                       contracts,
                       person_id == ^actor(:person_id) and
                         status in [:ACTIVE, :PAUSED] and
                         role in [:OWNER, :MANAGER]
                     )
                   )
    end

    # Default read requires explicit access.
    policy action_type(:read) do
      description "Users can read organisations they have access to."
      authorize_if relates_to_actor_via([:contracts, :person, :user])
      authorize_if relates_to_actor_via([:memberships, :person, :user])
    end
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
    identity :unique_name, [:name]
    identity :unique_slug, [:slug]
  end

  defp attach_owner_contract(changeset, ctx) do
    case ctx.actor do
      %{person_id: person_id} when not is_nil(person_id) ->
        Ash.Changeset.after_action(changeset, fn _changeset, organisation ->
          create_owner_contract(organisation, person_id)
        end)

      _ ->
        Ash.Changeset.add_error(changeset,
          field: :base,
          message: "actor is required to create an organisation"
        )
    end
  end

  defp create_owner_contract(organisation, person_id) do
    Chironium.Staff.Contract
    |> Ash.Changeset.for_create(:create, %{
      start_date: Date.utc_today(),
      end_date: nil,
      role: :OWNER,
      person_id: person_id,
      organisation_id: organisation.id,
      created_by_id: person_id
    })
    |> Ash.Changeset.change_attribute(:status, :ACTIVE)
    |> Ash.create(authorize?: false)
    |> case do
      {:ok, _contract} -> {:ok, organisation}
      {:error, error} -> {:error, error}
    end
  end
end
