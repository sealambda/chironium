defmodule Chironium.Health.Task do
  @moduledoc """
  A task to be performed.

  A task resource describes an activity that can be performed and tracks the state of completion of that activity.
  It is a representation that an activity should be or has been initiated, and eventually,
  represents the successful or unsuccessful completion of that activity.

  https://hl7.org/fhir/R5/task.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshGraphql.Resource,
      AshPaperTrail.Resource,
      AshArchival.Resource,
      AshStateMachine
    ]

  postgres do
    table "tasks"

    custom_indexes do
      index :requested_period, using: "gin"
    end
  end

  graphql do
    type :task

    queries do
      read_one :get_task, :read
      list :list_tasks, :read
    end

    mutations do
      create :create_task, :create
      update :set_ready_task, :ready
      update :start_task, :start
      update :complete_task, :complete
      update :fail_task, :fail
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:task]}
  end

  state_machine do
    state_attribute :status

    initial_states [:draft]
    default_initial_state :draft

    transitions do
      transition :cancel,
        from: [:draft, :ready, :requested, :received, :accepted, :rejected],
        to: :cancelled

      transition :ready, from: :draft, to: :ready
      transition :request, from: :ready, to: :requested
      transition :receive, from: :requested, to: :received

      transition :accept, from: [:requested, :received], to: :accepted
      transition :reject, from: [:requested, :received], to: :rejected

      transition :start, from: [:ready, :accepted], to: :in_progress
      transition :suspend, from: :in_progress, to: :on_hold
      transition :resume, from: :on_hold, to: :in_progress

      transition :complete, from: :in_progress, to: :completed
      transition :fail, from: :in_progress, to: :failed

      transition :destroy, from: :*, to: :entered_in_error
    end
  end

  actions do
    defaults [:read, :destroy, create: :*]

    update :ready do
      change transition_state(:ready)
    end

    update :start do
      change transition_state(:in_progress)

      change fn changeset, _context ->
        Ash.Changeset.force_change_attribute(changeset, :execution_period, %{
          "start" => DateTime.utc_now()
        })
      end
    end

    update :complete do
      change transition_state(:completed)

      change fn changeset, _context ->
        start_time =
          case changeset.data.execution_period do
            %Chironium.Datatypes.Period{start: start} -> start
            _ -> DateTime.utc_now()
          end

        Ash.Changeset.force_change_attribute(changeset, :execution_period, %{
          "start" => start_time,
          "end" => DateTime.utc_now()
        })
      end
    end

    update :fail do
      change transition_state(:failed)

      change fn changeset, _context ->
        start_time =
          case changeset.data.execution_period do
            %Chironium.Datatypes.Period{start: start} -> start
            _ -> DateTime.utc_now()
          end

        Ash.Changeset.force_change_attribute(changeset, :execution_period, %{
          "start" => start_time,
          "end" => DateTime.utc_now()
        })
      end
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :status, Chironium.Health.Task.Status do
      allow_nil? false
      default :draft
      public? true
      writable? false
    end

    attribute :intent, Chironium.Health.Task.Intent do
      description "Distinguishes whether the task is a proposal, plan, or full order"
      allow_nil? false
      public? true
    end

    attribute :priority, Chironium.Health.Task.Priority do
      description "Urgency of the task"
      public? true
    end

    attribute :do_not_perform, :boolean do
      description "True if Task is prohibiting action"
      public? true
    end

    attribute :description, :string do
      description "Human-readable explanation of task"
      public? true
    end

    attribute :requested_period, Chironium.Datatypes.Period do
      description "When the task should be performed"
      public? true
    end

    attribute :execution_period, Chironium.Datatypes.Period do
      description "Start and end time of execution"
      writable? false
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments made about the task"
      public? true
    end
  end

  relationships do
    # TODO: This reference should not be directly public, but rather use a union type on "for" that includes Patient and Practitioner (and potentially others in the future)
    belongs_to :for_patient, Chironium.Health.Patient do
      description "Beneficiary of the Task"
      public? true
    end
  end

  calculations do
    calculate :requested_period_start_sort_key,
              :datetime,
              expr(fragment("(?->>'start')::timestamp", requested_period)) do
      description "Helper calculation to sort by requested_period.start"
      public? true
    end
  end
end
