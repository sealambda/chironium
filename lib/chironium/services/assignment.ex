defmodule Chironium.Services.Assignment do
  @moduledoc """
  Links a customer membership to a staff contract.

  Represents the assignment of a customer to a specific staff member.
  Only STAFF or MANAGER roles can have assignments.
  A membership can only have one active assignment at a time.

  ## Multitenancy

  This resource is tenant-scoped by `organisation_id`. The organisation
  is derived from the membership/contract relationships.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Services,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "assignments"
    repo Chironium.Repo

    references do
      reference :membership, on_delete: :delete
      reference :contract, on_delete: :delete
      reference :organisation, on_delete: :delete
      reference :created_by, on_delete: :nilify
    end
  end

  actions do
    defaults [:read]

    create :create do
      description "Creates an assignment between a membership and a contract."
      accept [:start_date, :end_date, :membership_id, :contract_id, :created_by_id]

      # Auto-populate organisation_id from membership.
      change fn changeset, _ctx ->
        membership_id = Ash.Changeset.get_attribute(changeset, :membership_id)

        if membership_id do
          case Ash.get(Chironium.Customers.Membership, membership_id, authorize?: false) do
            {:ok, membership} ->
              Ash.Changeset.change_attribute(
                changeset,
                :organisation_id,
                membership.organisation_id
              )

            {:error, _} ->
              changeset
          end
        else
          changeset
        end
      end
    end

    update :update do
      require_atomic? false
    end
  end

  policies do
    # Read access: staff of the org can read assignments.
    policy action_type(:read) do
      description "Staff can read assignments in their org."
      authorize_if Chironium.Staff.Checks.ActorIsOrgOwnerOrManager
      # Staff members can read their own assignments.
      authorize_if expr(contract.person_id == ^actor(:person_id))
    end

    # Create/update: only OWNER/MANAGER of the org.
    policy action([:create, :update]) do
      description "Only org owners/managers can create/update assignments."
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

    create_timestamp :created_at, type: :utc_datetime_usec
  end

  relationships do
    belongs_to :membership, Chironium.Customers.Membership do
      allow_nil? false
      public? true
    end

    belongs_to :contract, Chironium.Staff.Contract do
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

    has_many :biometric_records, Chironium.Health.BiometricRecord
    has_many :nutrition_plans, Chironium.Health.NutritionPlan
    has_many :menstrual_cycles, Chironium.Health.MenstrualCycle
    has_many :diagnoses, Chironium.Health.Diagnosis
  end
end
