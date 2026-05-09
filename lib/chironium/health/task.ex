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
      AshStateMachine,
      AshOban
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
      destroy :delete_task_reminder, :delete_reminder
      update :update_task_reminder, :update_reminder
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

      transition :mark_entered_in_error, from: :*, to: :entered_in_error
    end
  end

  oban do
    list_tenants Chironium.AshOban.ListTenants

    triggers do
      trigger :send_reminder do
        scheduler_cron "@hourly"
        action :send_reminder
        read_action :tasks_needing_reminder
        worker_module_name __MODULE__.AshOban.SendReminder.Worker
        scheduler_module_name __MODULE__.AshOban.SendReminder.Scheduler
      end
    end
  end

  actions do
    defaults [:read, :destroy, create: :*]

    read :tasks_needing_reminder do
      description "Tasks in actionable states whose reminder is due."

      pagination keyset?: true

      filter expr(
               status in [:ready, :accepted] and
                 not is_nil(requested_period)
             )

      prepare Chironium.Health.Preparations.FilterByRequestedPeriodWindow
    end

    update :ready do
      change transition_state(:ready)
    end

    update :update_reminder do
      description "Update the requested reminder period for a pending task."
      require_atomic? false

      accept [:requested_period, :description]

      change fn changeset, _context ->
        if changeset.data.status in [:ready, :accepted] do
          changeset
        else
          Ash.Changeset.add_error(
            changeset,
            field: :status,
            message: "Only pending reminders can be edited."
          )
        end
      end
    end

    destroy :delete_reminder do
      description "Delete a pending reminder task."
      require_atomic? false

      change fn changeset, _context ->
        if changeset.data.status in [:ready, :accepted] do
          changeset
        else
          Ash.Changeset.add_error(
            changeset,
            field: :status,
            message: "Only pending reminders can be deleted."
          )
        end
      end
    end

    update :request do
      change transition_state(:requested)
    end

    update :receive do
      change transition_state(:received)
    end

    update :accept do
      change transition_state(:accepted)
    end

    update :reject do
      change transition_state(:rejected)
    end

    update :start do
      require_atomic? false
      change transition_state(:in_progress)

      change fn changeset, _context ->
        Ash.Changeset.force_change_attribute(changeset, :execution_period, %{
          "start" => DateTime.utc_now()
        })
      end
    end

    update :complete do
      require_atomic? false
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
      require_atomic? false
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

    update :cancel do
      change transition_state(:cancelled)
    end

    update :suspend do
      change transition_state(:on_hold)
    end

    update :resume do
      change transition_state(:in_progress)
    end

    update :mark_entered_in_error do
      change transition_state(:entered_in_error)
    end

    update :send_reminder do
      description "Send task reminder notifications to the patient's care team."
      require_atomic? false

      change {Chironium.Health.Changes.SendTaskReminder, []}
    end
  end

  policies do
    bypass AshOban.Checks.AshObanInteraction do
      authorize_if always()
    end

    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor,
                    relationship: :for_patient}
    end

    policy action(:update_reminder) do
      authorize_if Chironium.Health.Checks.TaskReminderEditableByActor
    end

    policy action(:delete_reminder) do
      authorize_if Chironium.Health.Checks.TaskReminderEditableByActor
    end

    policy action([:create, :update, :destroy]) do
      authorize_if actor_present()
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
