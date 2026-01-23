defmodule Chironium.Staff.Contract do
  @moduledoc """
  Represents a staff relationship with an organisation.

  ## Contract Creation

  New contracts are created by providing an email address (not selecting from
  person list for privacy). The system finds or creates the person and
  user (auth) automatically.

  For renewals, go through existing contract history where person is already linked.

  ## Roles

  - OWNER: Organisation owner.
  - MANAGER: Can manage contracts and memberships.
  - STAFF: Service provider (trainer, nutritionist, etc.).
  - SALES: Sales role.

  ## State Machine

  PENDING → ACTIVE ↔ PAUSED → COMPLETED/TERMINATED

  Only one active/paused contract per person per organisation.

  ## Multitenancy

  This resource is tenant-scoped by `organisation_id`. When a tenant is set,
  queries are automatically filtered to that organisation.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Staff,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshStateMachine]

  import Ash.Expr
  require Ash.Query

  postgres do
    table "contracts"
    repo Chironium.Repo

    references do
      reference :person, on_delete: :delete
      reference :organisation, on_delete: :delete
      reference :created_by, on_delete: :nilify
    end

    identity_wheres_to_sql unique_active_person_org: "(status IN ('PENDING', 'ACTIVE', 'PAUSED'))"
  end

  state_machine do
    initial_states [:PENDING]
    default_initial_state :PENDING
    state_attribute :status

    transitions do
      transition :activate, from: :PENDING, to: :ACTIVE
      transition :pause, from: :ACTIVE, to: :PAUSED
      transition :resume, from: :PAUSED, to: :ACTIVE
      transition :complete, from: :ACTIVE, to: :COMPLETED
      transition :terminate, from: [:ACTIVE, :PAUSED], to: :TERMINATED
    end
  end

  actions do
    defaults [:read]

    create :create do
      description "Creates a contract for an existing person (for renewals)."
      accept [:start_date, :end_date, :role, :person_id, :organisation_id, :created_by_id]
    end

    create :create_by_email do
      description "Creates a contract by email. Finds or creates person, profile, and user."
      accept [:start_date, :end_date, :role, :organisation_id, :created_by_id]
      argument :email, :ci_string, allow_nil?: false

      validate match(:email, ~r/^[^\s@]+@[^\s@]+\.[^\s@]+$/) do
        message "must be a valid email address"
      end

      change fn changeset, _ctx ->
        email =
          changeset
          |> Ash.Changeset.get_argument(:email)
          |> to_string()
          |> String.trim()
          |> String.downcase()

        organisation_id = Ash.Changeset.get_attribute(changeset, :organisation_id)

        case find_or_create_person_with_profile_and_user(email, organisation_id) do
          {:ok, person} ->
            Ash.Changeset.change_attribute(changeset, :person_id, person.id)

          {:error, error} ->
            Ash.Changeset.add_error(changeset,
              field: :email,
              message: "failed to create person: #{inspect(error)}"
            )
        end
      end
    end

    update :update do
      require_atomic? false
    end

    update :activate do
      require_atomic? false
      change transition_state(:ACTIVE)
    end

    update :pause do
      require_atomic? false
      change transition_state(:PAUSED)
    end

    update :resume do
      require_atomic? false
      change transition_state(:ACTIVE)
    end

    update :complete do
      require_atomic? false
      change transition_state(:COMPLETED)
    end

    update :terminate do
      require_atomic? false
      change transition_state(:TERMINATED)
    end
  end

  policies do
    # Read access: own contracts or contracts in managed orgs.
    policy action_type(:read) do
      description "People can read their own contracts or contracts in orgs they manage."
      # Person can read their own contract.
      authorize_if expr(person_id == ^actor(:person_id))
      # Person can read contracts in orgs where they have management role.
      authorize_if relates_to_actor_via([:organisation, :contracts, :person, :user])
    end

    # Create contracts: only OWNER/MANAGER of the org.
    policy action([:create, :create_by_email]) do
      description "Only org owners/managers can create contracts."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # State transitions: only OWNER/MANAGER of the org.
    policy action([:activate, :pause, :resume, :complete, :terminate]) do
      description "Only org owners/managers can change contract status."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
    end

    # Update: only OWNER/MANAGER of the org.
    policy action(:update) do
      description "Only org owners/managers can update contracts."
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

    attribute :role, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:STAFF, :MANAGER, :SALES, :OWNER]
    end

    attribute :status, :atom do
      allow_nil? false
      public? true
      default :PENDING
      constraints one_of: [:PENDING, :ACTIVE, :PAUSED, :COMPLETED, :TERMINATED]
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
    # Prevent duplicate active contracts for same person in same org.
    identity :unique_active_person_org, [:person_id, :organisation_id],
      where: expr(status in [:PENDING, :ACTIVE, :PAUSED])
  end

  # Helpers for create_by_email action.

  # Finds or creates Person + PersonProfile for contract creation.
  # User is NOT created here - it will be created lazily on first authentication.
  defp find_or_create_person_with_profile_and_user(email, organisation_id) do
    case find_person_by_profile_email(email) do
      {:ok, person} ->
        # Person exists via profile, return as-is.
        # User will be created on first auth (magic link or OAuth).
        {:ok, person}

      {:error, :not_found} ->
        # Person doesn't exist, create person + profile only.
        create_person_with_profile(email, organisation_id)
    end
  end

  defp find_person_by_profile_email(search_email) do
    Chironium.Core.PersonProfile
    |> Ash.Query.filter(expr(email == ^search_email))
    |> Ash.Query.load(:person)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> {:error, :not_found}
      {:ok, profile} -> {:ok, profile.person}
      error -> error
    end
  end

  # Creates Person + PersonProfile only.
  # User is deferred to first authentication (lazy creation).
  defp create_person_with_profile(email, organisation_id) do
    with {:ok, person} <-
           Chironium.Core.Person
           |> Ash.Changeset.for_create(:create, %{})
           |> Ash.create(authorize?: false),
         {:ok, _profile} <-
           Chironium.Core.PersonProfile
           |> Ash.Changeset.for_create(:create, %{
             person_id: person.id,
             organisation_id: organisation_id,
             email: email
           })
           |> Ash.create(authorize?: false) do
      {:ok, person}
    end
  end
end
