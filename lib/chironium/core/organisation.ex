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
            case Ash.get(Chironium.Core.Person, actor_person_id, authorize?: false) do
              {:ok, %{role: :ADMIN}} ->
                query

              _ ->
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
            end

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
            case Ash.get(Chironium.Core.Person, actor_person_id, authorize?: false) do
              {:ok, %{role: :ADMIN}} ->
                Ash.Query.sort(query, name: :asc_nils_last)

              _ ->
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
            end

          _ ->
            Ash.Query.filter(query, expr(false))
        end
      end
    end
  end

  policies do
    # ADMIN can create/update/destroy organisations.
    policy action_type([:create, :update, :destroy]) do
      description "Only system admins can modify organisations."
      authorize_if Chironium.Core.Checks.ActorIsAdmin
    end

    # Default read requires explicit access.
    policy action_type(:read) do
      description "Users can read organisations they have access to."
      authorize_if Chironium.Core.Checks.ActorIsAdmin
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
end
