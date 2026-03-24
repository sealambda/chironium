defmodule Chironium.Health.PatientFollowupWorkflowTest do
  @moduledoc """
  Tests for the recurrent patient follow-up workflow.

  The workflow models a practitioner setting up periodic check-ins with patients:

  1. A PlanDefinition + ActivityDefinition define the protocol (e.g. biweekly follow-up).
  2. A CarePlan is instantiated for a specific patient.
  3. ServiceRequests are created for each follow-up cycle.
  4. Tasks are created for the practitioner to act on.
  5. The practitioner completes the task and records observations.

  Future: Tasks may be backed by a Questionnaire sent to the patient,
  with the patient returning a QuestionnaireResponse.
  """

  use Chironium.DataCase
  import Chironium.Generator

  setup do
    actor = generate(user())
    org = generate(organization(actor: actor))
    tenant = "org_#{org.id}"

    opts = [tenant: tenant, authorize?: false]

    practitioner =
      Chironium.Health.Practitioner
      |> Ash.Changeset.for_create(
        :create,
        %{name: [%{family: "Smith", given: ["Jane"], use: :official}]},
        opts
      )
      |> Ash.create!()

    patient =
      Chironium.Health.Patient
      |> Ash.Changeset.for_create(:create, %{}, opts)
      |> Ash.create!()

    %{actor: actor, org: org, tenant: tenant, opts: opts, practitioner: practitioner, patient: patient}
  end

  describe "definitional layer (protocol)" do
    test "creates an activity definition for a biweekly follow-up task", %{opts: opts} do
      activity_def =
        Chironium.Health.ActivityDefinition
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: "biweekly-followup",
            title: "Biweekly Patient Follow-up",
            status: :active,
            description: "Contact the patient every two weeks to collect progress data.",
            kind: :task,
            intent: :order,
            priority: :routine,
            timing_duration: %{value: 14, code: :d}
          },
          opts
        )
        |> Ash.create!()

      assert activity_def.name == "biweekly-followup"
      assert activity_def.kind == :task
      assert activity_def.timing_duration.value == Decimal.new(14)
      assert activity_def.timing_duration.code == :d
      assert activity_def.status == :active
    end

    test "creates an activity definition for a weekly follow-up task", %{opts: opts} do
      activity_def =
        Chironium.Health.ActivityDefinition
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: "weekly-followup",
            title: "Weekly Patient Follow-up",
            status: :active,
            kind: :task,
            intent: :order,
            priority: :routine,
            timing_duration: %{value: 1, code: :wk}
          },
          opts
        )
        |> Ash.create!()

      assert activity_def.timing_duration.value == Decimal.new(1)
      assert activity_def.timing_duration.code == :wk
    end

    test "creates a plan definition referencing the follow-up activity", %{opts: opts} do
      plan_def =
        Chironium.Health.PlanDefinition
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: "patient-followup-protocol",
            title: "Patient Follow-up Protocol",
            status: :active,
            description: "Recurrent follow-up protocol for monitoring patient progress.",
            action: [
              %{
                title: "Follow-up check-in",
                description: "Contact patient and collect progress observations.",
                timing_duration: %{value: 14, code: :d}
              }
            ]
          },
          opts
        )
        |> Ash.create!()

      assert plan_def.name == "patient-followup-protocol"
      assert plan_def.status == :active
      assert [action] = plan_def.action
      assert action.title == "Follow-up check-in"
      assert action.timing_duration.value == Decimal.new(14)
    end
  end

  describe "request layer (patient-specific plan)" do
    test "creates a care plan for a patient", %{opts: opts, patient: patient} do
      care_plan =
        Chironium.Health.CarePlan
        |> Ash.Changeset.for_create(
          :create,
          %{
            title: "Biweekly Follow-up Plan",
            description: "Monitor patient progress with biweekly practitioner check-ins.",
            status: :active,
            intent: :plan,
            subject_id: patient.id,
            period: %{start: ~D[2026-03-24]}
          },
          opts
        )
        |> Ash.create!()

      assert care_plan.status == :active
      assert care_plan.intent == :plan
      assert care_plan.subject_id == patient.id
      assert care_plan.period.start == ~D[2026-03-24]
    end

    test "creates a service request linked to a care plan", %{
      opts: opts,
      patient: patient,
      practitioner: practitioner
    } do
      care_plan =
        Chironium.Health.CarePlan
        |> Ash.Changeset.for_create(
          :create,
          %{
            title: "Follow-up Plan",
            status: :active,
            intent: :plan,
            subject_id: patient.id
          },
          opts
        )
        |> Ash.create!()

      service_request =
        Chironium.Health.ServiceRequest
        |> Ash.Changeset.for_create(
          :create,
          %{
            status: :active,
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            care_plan_id: care_plan.id,
            requester_id: practitioner.id,
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            occurrence_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      assert service_request.status == :active
      assert service_request.care_plan_id == care_plan.id
      assert service_request.requester_id == practitioner.id
      assert service_request.subject_id == patient.id
    end
  end

  describe "execution layer (task lifecycle)" do
    setup %{opts: opts, patient: patient, practitioner: practitioner} do
      care_plan =
        Chironium.Health.CarePlan
        |> Ash.Changeset.for_create(
          :create,
          %{
            title: "Biweekly Follow-up",
            status: :active,
            intent: :plan,
            subject_id: patient.id
          },
          opts
        )
        |> Ash.create!()

      service_request =
        Chironium.Health.ServiceRequest
        |> Ash.Changeset.for_create(
          :create,
          %{
            status: :active,
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            care_plan_id: care_plan.id,
            requester_id: practitioner.id,
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            occurrence_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      %{care_plan: care_plan, service_request: service_request}
    end

    test "creates a task for the practitioner and walks through the full lifecycle", %{
      opts: opts,
      patient: patient,
      service_request: service_request
    } do
      task =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: service_request.id,
            description: "Contact patient for biweekly follow-up.",
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            restriction_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      assert task.state == :draft
      assert task.service_request_id == service_request.id

      # draft -> requested
      task = task |> Ash.Changeset.for_update(:request, %{}, opts) |> Ash.update!()
      assert task.state == :requested

      # requested -> accepted
      task = task |> Ash.Changeset.for_update(:accept, %{}, opts) |> Ash.update!()
      assert task.state == :accepted

      # accepted -> in_progress
      task = task |> Ash.Changeset.for_update(:start, %{}, opts) |> Ash.update!()
      assert task.state == :in_progress

      # in_progress -> completed
      task = task |> Ash.Changeset.for_update(:complete, %{}, opts) |> Ash.update!()
      assert task.state == :completed
    end

    test "practitioner completes task and records an observation", %{
      opts: opts,
      patient: patient,
      service_request: service_request
    } do
      task =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: service_request.id,
            description: "Contact patient for biweekly follow-up."
          },
          opts
        )
        |> Ash.create!()

      # Move task through to completion.
      task =
        task
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:complete, %{}, opts)
        |> Ash.update!()

      assert task.state == :completed

      # Practitioner records observation based on patient's reported data.
      observation =
        Chironium.Health.Observation
        |> Ash.Changeset.for_create(
          :log_body_weight,
          %{subject_id: patient.id, weight_kg: 72.5},
          opts
        )
        |> Ash.create!()

      assert observation.value_quantity.value == Decimal.new("72.5")
    end

    test "task can be cancelled if patient is unreachable", %{
      opts: opts,
      patient: patient,
      service_request: service_request
    } do
      task =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: service_request.id,
            description: "Contact patient for follow-up."
          },
          opts
        )
        |> Ash.create!()

      task =
        task
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()

      assert task.state == :in_progress

      # Patient unreachable, cancel the task.
      task = task |> Ash.Changeset.for_update(:cancel, %{}, opts) |> Ash.update!()
      assert task.state == :cancelled
    end

    test "task can be suspended and resumed", %{
      opts: opts,
      patient: patient,
      service_request: service_request
    } do
      task =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: service_request.id,
            description: "Contact patient for follow-up."
          },
          opts
        )
        |> Ash.create!()

      task =
        task
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()

      assert task.state == :in_progress

      # Suspend (e.g., waiting for patient callback).
      task = task |> Ash.Changeset.for_update(:suspend, %{}, opts) |> Ash.update!()
      assert task.state == :on_hold

      # Resume when patient calls back.
      task = task |> Ash.Changeset.for_update(:resume, %{}, opts) |> Ash.update!()
      assert task.state == :in_progress

      # Complete after gathering data.
      task = task |> Ash.Changeset.for_update(:complete, %{}, opts) |> Ash.update!()
      assert task.state == :completed
    end
  end

  describe "recurrent follow-up (multiple cycles)" do
    test "simulates two consecutive biweekly follow-up cycles", %{
      opts: opts,
      patient: patient,
      practitioner: practitioner
    } do
      care_plan =
        Chironium.Health.CarePlan
        |> Ash.Changeset.for_create(
          :create,
          %{
            title: "Biweekly Follow-up",
            status: :active,
            intent: :plan,
            subject_id: patient.id,
            period: %{start: ~D[2026-03-24]}
          },
          opts
        )
        |> Ash.create!()

      # --- Cycle 1: Week 1-2 ---
      sr1 =
        Chironium.Health.ServiceRequest
        |> Ash.Changeset.for_create(
          :create,
          %{
            status: :active,
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            care_plan_id: care_plan.id,
            requester_id: practitioner.id,
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            occurrence_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      task1 =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: sr1.id,
            description: "Cycle 1: Contact patient for biweekly follow-up.",
            restriction_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      task1 =
        task1
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:complete, %{}, opts)
        |> Ash.update!()

      assert task1.state == :completed

      # Record observation from cycle 1.
      obs1 =
        Chironium.Health.Observation
        |> Ash.Changeset.for_create(
          :log_body_weight,
          %{subject_id: patient.id, weight_kg: 73.0},
          opts
        )
        |> Ash.create!()

      # --- Cycle 2: Week 3-4 ---
      sr2 =
        Chironium.Health.ServiceRequest
        |> Ash.Changeset.for_create(
          :create,
          %{
            status: :active,
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            care_plan_id: care_plan.id,
            requester_id: practitioner.id,
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            occurrence_period: %{start: ~D[2026-04-07], end: ~D[2026-04-21]}
          },
          opts
        )
        |> Ash.create!()

      task2 =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: sr2.id,
            description: "Cycle 2: Contact patient for biweekly follow-up.",
            restriction_period: %{start: ~D[2026-04-07], end: ~D[2026-04-21]}
          },
          opts
        )
        |> Ash.create!()

      task2 =
        task2
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:complete, %{}, opts)
        |> Ash.update!()

      assert task2.state == :completed

      # Record observation from cycle 2: patient lost weight.
      obs2 =
        Chironium.Health.Observation
        |> Ash.Changeset.for_create(
          :log_body_weight,
          %{subject_id: patient.id, weight_kg: 71.5},
          opts
        )
        |> Ash.create!()

      # Verify both service requests are linked to the same care plan.
      care_plan_with_srs = Ash.load!(care_plan, :service_requests, opts)
      assert length(care_plan_with_srs.service_requests) == 2

      sr_ids = Enum.map(care_plan_with_srs.service_requests, & &1.id) |> Enum.sort()
      assert sr_ids == Enum.sort([sr1.id, sr2.id])

      # Verify observations were recorded in sequence.
      assert Decimal.lt?(obs2.value_quantity.value, obs1.value_quantity.value)
    end
  end

  describe "full end-to-end workflow" do
    test "from protocol definition through task completion and observation recording", %{
      opts: opts,
      patient: patient,
      practitioner: practitioner
    } do
      # 1. Define the protocol.
      activity_def =
        Chironium.Health.ActivityDefinition
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: "biweekly-followup",
            title: "Biweekly Patient Follow-up",
            status: :active,
            kind: :task,
            intent: :order,
            priority: :routine,
            timing_duration: %{value: 14, code: :d}
          },
          opts
        )
        |> Ash.create!()

      plan_def =
        Chironium.Health.PlanDefinition
        |> Ash.Changeset.for_create(
          :create,
          %{
            name: "patient-followup-protocol",
            title: "Patient Follow-up Protocol",
            status: :active,
            action: [
              %{
                title: "Biweekly check-in",
                description: "Contact patient to collect progress.",
                timing_duration: %{value: 14, code: :d}
              }
            ]
          },
          opts
        )
        |> Ash.create!()

      # 2. Instantiate for a specific patient.
      care_plan =
        Chironium.Health.CarePlan
        |> Ash.Changeset.for_create(
          :create,
          %{
            title: "Follow-up for patient",
            status: :active,
            intent: :plan,
            subject_id: patient.id,
            period: %{start: ~D[2026-03-24]}
          },
          opts
        )
        |> Ash.create!()

      service_request =
        Chironium.Health.ServiceRequest
        |> Ash.Changeset.for_create(
          :create,
          %{
            status: :active,
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            care_plan_id: care_plan.id,
            requester_id: practitioner.id,
            code: %{
              coding: [%{system: "http://snomed.info/sct", code: "386053000", display: "Follow-up evaluation"}]
            },
            occurrence_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      # 3. Create and complete the task.
      task =
        Chironium.Health.Task
        |> Ash.Changeset.for_create(
          :create,
          %{
            intent: :order,
            priority: :routine,
            subject_id: patient.id,
            service_request_id: service_request.id,
            description: "Contact patient for biweekly follow-up.",
            restriction_period: %{start: ~D[2026-03-24], end: ~D[2026-04-07]}
          },
          opts
        )
        |> Ash.create!()

      task =
        task
        |> Ash.Changeset.for_update(:request, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:accept, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:start, %{}, opts)
        |> Ash.update!()
        |> Ash.Changeset.for_update(:complete, %{}, opts)
        |> Ash.update!()

      assert task.state == :completed

      # 4. Record observation from the follow-up conversation.
      observation =
        Chironium.Health.Observation
        |> Ash.Changeset.for_create(
          :log_body_weight,
          %{subject_id: patient.id, weight_kg: 72.0},
          opts
        )
        |> Ash.create!()

      assert observation.value_quantity.value == Decimal.new("72.0")

      # 5. Verify the full chain: CarePlan -> ServiceRequest -> Task.
      loaded_sr = Ash.load!(service_request, [:subject, :care_plan, :requester], opts)
      assert loaded_sr.care_plan.id == care_plan.id
      assert loaded_sr.subject.id == patient.id
      assert loaded_sr.requester.id == practitioner.id

      loaded_task = Ash.load!(task, [:subject, :service_request], opts)
      assert loaded_task.service_request.id == service_request.id
      assert loaded_task.subject.id == patient.id

      # Verify definitions exist independently of instances.
      fetched_activity = Ash.get!(Chironium.Health.ActivityDefinition, activity_def.id, opts)
      assert fetched_activity.kind == :task

      fetched_plan = Ash.get!(Chironium.Health.PlanDefinition, plan_def.id, opts)
      assert [_action] = fetched_plan.action
    end
  end
end
