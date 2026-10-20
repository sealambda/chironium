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

  # Open reminders, before they are started or finished.
  @reminder_statuses [:ready, :accepted]

  postgres do
    table "tasks"

    custom_indexes do
      index :requested_period, using: "gin"
    end
  end

  field_policies do
    # Notes are internal to the care team.
    field_policy :note do
      forbid_if Chironium.Health.Checks.ActorIsPatient
      authorize_if always()
    end

    field_policy :* do
      authorize_if always()
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
      update :update_task, :update
      update :set_ready_task, :ready
      update :start_task, :start
      update :complete_task, :complete
      update :fail_task, :fail
      update :cancel_task, :cancel
      destroy :delete_task, :destroy

      create :request_questionnaire, :request_questionnaire
      update :reissue_questionnaire_link, :reissue_questionnaire_link
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource, [:task]}

    # The reminder stamp has no actor and would show as the task's last change in the feed.
    ignore_actions [:send_reminder]
  end

  state_machine do
    state_attribute :status

    # Questionnaire requests start as `requested`: they are sent on creation.
    initial_states [:draft, :requested]
    default_initial_state :draft

    transitions do
      transition :cancel,
        from: [
          :draft,
          :ready,
          :requested,
          :received,
          :accepted,
          :rejected,
          :in_progress,
          :on_hold
        ],
        to: :cancelled

      transition :ready, from: :draft, to: :ready
      transition :request, from: :ready, to: :requested
      transition :receive, from: :requested, to: :received

      transition :accept, from: [:requested, :received], to: :accepted
      transition :reject, from: [:requested, :received], to: :rejected

      # A patient opening a questionnaire link starts a `requested` task.
      transition :start, from: [:ready, :accepted, :requested], to: :in_progress
      transition :suspend, from: :in_progress, to: :on_hold
      transition :resume, from: :on_hold, to: :in_progress

      # Reminders complete in one step, without being started first.
      transition :complete, from: [:in_progress, :requested, :ready, :accepted], to: :completed
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
    defaults [:read, :destroy, update: :*, create: :*]

    read :tasks_needing_reminder do
      description "Tasks in actionable states whose reminder is due."

      pagination keyset?: true

      # Questionnaire requests have their own link lifecycle, not reminders.
      filter expr(
               status in ^@reminder_statuses and
                 not is_nil(requested_period) and
                 is_nil(focus_questionnaire_id) and
                 is_nil(reminder_sent_at)
             )

      prepare Chironium.Health.Preparations.FilterByRequestedPeriodWindow
    end

    update :ready do
      change transition_state(:ready)
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
      require_atomic? false
      change transition_state(:cancelled)
      change Chironium.Health.Task.Changes.RevokeQuestionnaireLinks
    end

    create :request_questionnaire do
      description "Sends a questionnaire to a patient as a single-use link."

      argument :patient_id, :uuid, allow_nil?: false
      argument :questionnaire_id, :uuid, allow_nil?: false

      argument :due_date, :date do
        description "When the answers are needed. A later date extends the link, up to 14 days."
      end

      argument :message, :string do
        description "A note shown to the patient with the questionnaire."
      end

      change transition_state(:requested)
      change manage_relationship(:patient_id, :for_patient, type: :append)
      change Chironium.Health.Task.Changes.RequestQuestionnaire
      change Chironium.Health.Task.Changes.IssueQuestionnaireLinks

      metadata :link_url, :string do
        description "The single-use link for the practitioner to copy or share."
        allow_nil? false
      end

      metadata :email_sent, :boolean do
        description "Whether the link was also emailed to the patient."
        allow_nil? false
      end
    end

    update :reissue_questionnaire_link do
      description "Replaces an open request's links with new ones and a fresh expiry."
      require_atomic? false

      change Chironium.Health.Task.Changes.ReissueQuestionnaireLink
      change Chironium.Health.Task.Changes.IssueQuestionnaireLinks

      metadata :link_url, :string do
        allow_nil? false
      end

      metadata :email_sent, :boolean do
        allow_nil? false
      end
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

      change set_attribute(:reminder_sent_at, &DateTime.utc_now/0)
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

    policy action(:tasks_needing_reminder) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end

    policy action_type(:read) do
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor,
                    relationship: :for_patient}

      authorize_if Chironium.Health.Checks.TaskVisibleToPatient
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end
  end

  changes do
    # A new date gets its own reminder.
    change set_attribute(:reminder_sent_at, nil),
      on: [:update],
      where: [changing(:requested_period)]
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

    attribute :code, Chironium.Datatypes.CodeableConcept do
      description "Task type; FHIR SDC `complete-questionnaire` for questionnaire requests"
      public? true
      writable? false
    end

    attribute :reminder_sent_at, :utc_datetime_usec do
      description "When the care team was reminded of the task; cleared when its date changes"
      public? true
      writable? false
    end

    attribute :access_expires_at, :utc_datetime_usec do
      description "When the patient's questionnaire link and session stop working"
      public? true
      writable? false
    end
  end

  relationships do
    # TODO: This reference should not be directly public, but rather use a union type on "for" that includes Patient and Practitioner (and potentially others in the future)
    belongs_to :for_patient, Chironium.Health.Patient do
      description "Beneficiary of the Task"
      public? true
    end

    belongs_to :focus_questionnaire, Chironium.Health.Questionnaire do
      description "The questionnaire the patient is asked to complete"
      public? true
      attribute_writable? false
      # Archiving a questionnaire must not orphan the requests already sent for it.
      read_action :read_including_archived
    end

    belongs_to :requester_practitioner, Chironium.Health.Practitioner do
      description "The practitioner who asked for the task"
      public? true
      attribute_writable? false
    end

    has_one :output_questionnaire_response, Chironium.Health.QuestionnaireResponse do
      description "The response that fulfilled a questionnaire request"
      public? true
      destination_attribute :task_id
    end
  end

  calculations do
    calculate :requester_name, :string, Chironium.Health.Task.Calculations.RequesterName do
      description "Display name of the practitioner who asked for the task"
      public? true
    end

    calculate :organization_name, :string, Chironium.Health.Task.Calculations.OrganizationName do
      description "Name of the organization the task belongs to"
      public? true
    end

    calculate :requested_period_start_sort_key,
              :datetime,
              expr(fragment("(?->>'start')::timestamptz", requested_period)) do
      description "Helper calculation to sort by requested_period.start"
      public? true
    end
  end
end
