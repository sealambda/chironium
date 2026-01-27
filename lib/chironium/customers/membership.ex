defmodule Chironium.Customers.Membership do
  @moduledoc """
  Represents a customer relationship with an organisation.

  Memberships follow a simple state machine: LEAD → ACTIVE ↔ PAUSED → COMPLETED/TERMINATED.
  Only one active/paused membership per person per organisation.

  ## Multitenancy

  This resource is tenant-scoped by `organisation_id`. When a tenant is set,
  queries are automatically filtered to that organisation.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Customers,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshStateMachine, AshGraphql.Resource]

  import Ash.Expr
  require Ash.Query

  postgres do
    table "memberships"
    repo Chironium.Repo

    references do
      reference :person, on_delete: :delete
      reference :organisation, on_delete: :delete
      reference :created_by, on_delete: :nilify
    end

    identity_wheres_to_sql unique_active_person_org: "(status IN ('ACTIVE', 'PAUSED'))"
  end

  graphql do
    type :membership

    queries do
      list :customer_list, :customer_list
    end
  end

  state_machine do
    initial_states [:LEAD]
    default_initial_state :LEAD
    state_attribute :status

    transitions do
      transition :activate, from: :LEAD, to: :ACTIVE
      transition :pause, from: :ACTIVE, to: :PAUSED
      transition :resume, from: :PAUSED, to: :ACTIVE
      transition :complete, from: :ACTIVE, to: :COMPLETED
      transition :terminate, from: [:ACTIVE, :PAUSED], to: :TERMINATED
    end
  end

  actions do
    defaults [:read]

    read :customer_list do
      description "Lists customers for the authenticated user based on their role and organisation."
      argument :organisation_id, :uuid, allow_nil?: false

      prepare fn query, ctx ->
        organisation_id = Ash.Query.get_argument(query, :organisation_id)

        # Set tenant to scope to the organisation.
        query = Ash.Query.set_tenant(query, organisation_id)

        case ctx.actor do
          %{person_id: actor_person_id} when not is_nil(actor_person_id) ->
            # Check if actor is ADMIN.
            case Ash.get(Chironium.Core.Person, actor_person_id, authorize?: false) do
              {:ok, %{role: :ADMIN}} ->
                # ADMIN: see all memberships in the org.
                query

              _ ->
                # Check contract role in the org.
                contract =
                  Chironium.Staff.Contract
                  |> Ash.Query.for_read(:read)
                  |> Ash.Query.filter(expr(person_id == ^actor_person_id))
                  |> Ash.Query.filter(expr(organisation_id == ^organisation_id))
                  |> Ash.Query.filter(expr(status in [:ACTIVE, :PAUSED]))
                  |> Ash.read_one(authorize?: false)

                case contract do
                  {:ok, %{role: role}} when role in [:OWNER, :MANAGER] ->
                    # OWNER/MANAGER: see all memberships in the org.
                    query

                  {:ok, %{role: :STAFF, id: contract_id}} ->
                    # STAFF: only see memberships with active assignments.
                    today = Date.utc_today()

                    Ash.Query.filter(
                      query,
                      expr(
                        exists(
                          assignments,
                          contract_id == ^contract_id and (is_nil(end_date) or end_date >= ^today)
                        )
                      )
                    )

                  _ ->
                    # No valid contract: return nothing.
                    Ash.Query.filter(query, expr(false))
                end
            end

          _ ->
            # No actor: return nothing.
            Ash.Query.filter(query, expr(false))
        end
      end
    end

    create :create do
      description "Creates a membership for an existing person."
      accept [:start_date, :end_date, :person_id, :organisation_id, :created_by_id]
    end

    create :create_lead do
      description "Creates a lead membership with minimal person data."
      accept [:start_date, :organisation_id, :created_by_id]
      argument :given_name, :string, allow_nil?: true
      argument :st_surname, :string, allow_nil?: true

      change fn changeset, _ctx ->
        given_name = Ash.Changeset.get_argument(changeset, :given_name)
        st_surname = Ash.Changeset.get_argument(changeset, :st_surname)

        case create_lead_person(given_name, st_surname) do
          {:ok, person} ->
            Ash.Changeset.change_attribute(changeset, :person_id, person.id)

          {:error, error} ->
            Ash.Changeset.add_error(changeset,
              field: :person_id,
              message: "failed to create person: #{inspect(error)}"
            )
        end
      end
    end

    update :update do
      require_atomic? false
    end

    update :activate do
      description "Activates a lead membership."
      require_atomic? false
      change transition_state(:ACTIVE)
    end

    update :pause do
      description "Pauses an active membership."
      require_atomic? false
      change transition_state(:PAUSED)
    end

    update :resume do
      description "Resumes a paused membership."
      require_atomic? false
      change transition_state(:ACTIVE)
    end

    update :complete do
      description "Marks membership as completed."
      require_atomic? false
      change transition_state(:COMPLETED)
    end

    update :terminate do
      description "Terminates membership."
      require_atomic? false
      change transition_state(:TERMINATED)
    end
  end

  policies do
    # Customer list: ADMIN, OWNER/MANAGER (all), or STAFF (with assignments).
    policy action(:customer_list) do
      description "Authenticated users can list customers based on their role."
      authorize_if actor_present()
    end

    # Read access: own memberships or memberships in managed orgs.
    policy action_type(:read) do
      description "People can read their own memberships or memberships in orgs they manage."
      authorize_if expr(person_id == ^actor(:person_id))
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # Create memberships: only OWNER/MANAGER/SALES of the org.
    policy action([:create, :create_lead]) do
      description "Only org owners/managers/sales can create memberships."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # State transitions: staff of the org.
    policy action([
             :activate,
             :pause,
             :resume,
             :complete,
             :terminate
           ]) do
      description "Only org staff can change membership status."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # Update: only staff of the org.
    policy action(:update) do
      description "Only org staff can update memberships."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end
  end

  multitenancy do
    strategy :attribute
    attribute :organisation_id
    global? true
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

    attribute :status, :atom do
      allow_nil? false
      public? true
      default :LEAD

      constraints one_of: [
                    :LEAD,
                    :ACTIVE,
                    :PAUSED,
                    :COMPLETED,
                    :TERMINATED
                  ]
    end

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :person, Chironium.Core.Person do
      allow_nil? false
      public? true
    end

    belongs_to :organisation, Chironium.Core.Organisation do
      allow_nil? false
      public? true
    end

    belongs_to :created_by, Chironium.Core.Person do
      allow_nil? true
      public? true
    end

    has_many :assignments, Chironium.Services.Assignment
  end

  identities do
    # Prevent duplicate active memberships for same person in same org.
    identity :unique_active_person_org, [:person_id, :organisation_id],
      where: expr(status in [:LEAD, :ACTIVE, :PAUSED])
  end

  defp create_lead_person(given_name, st_surname) do
    Chironium.Core.Person
    |> Ash.Changeset.for_create(:create_lead, %{
      given_name: given_name,
      st_surname: st_surname
    })
    |> Ash.create(authorize?: false)
  end
end
