defmodule Chironium.Health.TaskLifecycleTest do
  @moduledoc """
  Tests for Task CRUD and state-machine transitions.

  Covered:
  - Creating tasks with required fields.
  - Updating mutable fields (description, requested_period, note) via `:update`.
  - All state transitions defined on the state machine.
  - Execution period timestamps set by `:start`, `:complete`, and `:fail`.
  - Destroying tasks.
  - Authorization: any authenticated actor may write; nil actor is denied.

  AshOban send_reminder trigger scheduling is tested separately in
  `TaskReminderTriggerTest`.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # Create
  # ---------------------------------------------------------------------------

  describe "create" do
    test "creates a task in :draft state with intent", ctx do
      assert {:ok, task} =
               Chironium.Health.Task
               |> Ash.Changeset.for_create(
                 :create,
                 %{intent: :order, description: "Take medication"},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()

      assert task.status == :draft
      assert task.intent == :order
      assert task.description == "Take medication"
    end

    test "nil actor is denied", ctx do
      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Health.Task
               |> Ash.Changeset.for_create(
                 :create,
                 %{intent: :order},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end
  end

  # ---------------------------------------------------------------------------
  # Update
  # ---------------------------------------------------------------------------

  describe "update" do
    test "updates description and requested_period", ctx do
      task = create_task(ctx)
      new_start = DateTime.add(DateTime.utc_now(), 3, :day)
      new_end = DateTime.add(new_start, 2, :hour)

      assert {:ok, updated} =
               task
               |> Ash.Changeset.for_update(
                 :update,
                 %{
                   description: "Revised task",
                   requested_period: %{start: new_start, end: new_end}
                 },
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert updated.description == "Revised task"

      assert DateTime.compare(
               updated.requested_period.start,
               DateTime.truncate(new_start, :second)
             ) == :eq
    end

    test "appends a note", ctx do
      task = create_task(ctx)
      note_text = "Follow up needed."

      assert {:ok, updated} =
               task
               |> Ash.Changeset.for_update(
                 :update,
                 %{note: [%{text: note_text, author_string: "Nurse", time: DateTime.utc_now()}]},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      assert hd(updated.note).text == note_text
    end

    test "nil actor is denied", ctx do
      task = create_task(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               task
               |> Ash.Changeset.for_update(
                 :update,
                 %{description: "No actor"},
                 actor: nil,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # State transitions
  # ---------------------------------------------------------------------------

  describe ":ready transition" do
    test "transitions task from :draft to :ready", ctx do
      task = create_task(ctx)

      assert {:ok, ready} = transition(task, :ready, ctx)
      assert ready.status == :ready
    end

    test "cannot transition to :ready from :cancelled", ctx do
      task = create_task(ctx) |> transition!(:cancel, ctx)

      assert {:error, _} = transition(task, :ready, ctx)
    end
  end

  describe ":request transition" do
    test "transitions task from :ready to :requested", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx)

      assert {:ok, requested} = transition(task, :request, ctx)
      assert requested.status == :requested
    end
  end

  describe ":receive transition" do
    test "transitions task from :requested to :received", ctx do
      task =
        create_task(ctx)
        |> transition!(:ready, ctx)
        |> transition!(:request, ctx)

      assert {:ok, received} = transition(task, :receive, ctx)
      assert received.status == :received
    end
  end

  describe ":accept transition" do
    test "transitions from :requested to :accepted", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:request, ctx)

      assert {:ok, accepted} = transition(task, :accept, ctx)
      assert accepted.status == :accepted
    end

    test "transitions from :received to :accepted", ctx do
      task =
        create_task(ctx)
        |> transition!(:ready, ctx)
        |> transition!(:request, ctx)
        |> transition!(:receive, ctx)

      assert {:ok, accepted} = transition(task, :accept, ctx)
      assert accepted.status == :accepted
    end
  end

  describe ":reject transition" do
    test "transitions from :requested to :rejected", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:request, ctx)

      assert {:ok, rejected} = transition(task, :reject, ctx)
      assert rejected.status == :rejected
    end
  end

  describe ":start transition" do
    test "transitions from :ready to :in_progress and sets execution_period.start", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx)

      assert {:ok, in_progress} = transition(task, :start, ctx)
      assert in_progress.status == :in_progress
      assert in_progress.execution_period.start != nil
    end

    test "transitions from :accepted to :in_progress", ctx do
      task =
        create_task(ctx)
        |> transition!(:ready, ctx)
        |> transition!(:request, ctx)
        |> transition!(:accept, ctx)

      assert {:ok, in_progress} = transition(task, :start, ctx)
      assert in_progress.status == :in_progress
    end
  end

  describe ":complete transition" do
    test "transitions from :in_progress to :completed and sets execution_period.end", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:start, ctx)

      assert {:ok, completed} = transition(task, :complete, ctx)
      assert completed.status == :completed
      assert completed.execution_period.end != nil
    end

    test "preserves execution_period.start when completing", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:start, ctx)
      started_at = task.execution_period.start

      assert {:ok, completed} = transition(task, :complete, ctx)

      assert DateTime.compare(completed.execution_period.start, started_at) == :eq
    end
  end

  describe ":fail transition" do
    test "transitions from :in_progress to :failed and sets execution_period.end", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:start, ctx)

      assert {:ok, failed} = transition(task, :fail, ctx)
      assert failed.status == :failed
      assert failed.execution_period.end != nil
    end
  end

  describe ":suspend and :resume transitions" do
    test "transitions from :in_progress to :on_hold and back to :in_progress", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:start, ctx)

      assert {:ok, on_hold} = transition(task, :suspend, ctx)
      assert on_hold.status == :on_hold

      assert {:ok, resumed} = transition(on_hold, :resume, ctx)
      assert resumed.status == :in_progress
    end
  end

  describe ":cancel transition" do
    test "cancels a :draft task", ctx do
      task = create_task(ctx)

      assert {:ok, cancelled} = transition(task, :cancel, ctx)
      assert cancelled.status == :cancelled
    end

    test "cancels a :ready task", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx)

      assert {:ok, cancelled} = transition(task, :cancel, ctx)
      assert cancelled.status == :cancelled
    end

    test "cancels an :accepted task", ctx do
      task =
        create_task(ctx)
        |> transition!(:ready, ctx)
        |> transition!(:request, ctx)
        |> transition!(:accept, ctx)

      assert {:ok, cancelled} = transition(task, :cancel, ctx)
      assert cancelled.status == :cancelled
    end
  end

  describe ":mark_entered_in_error transition" do
    test "can mark a :draft task as entered_in_error", ctx do
      task = create_task(ctx)

      assert {:ok, errored} = transition(task, :mark_entered_in_error, ctx)
      assert errored.status == :entered_in_error
    end

    test "can mark an :in_progress task as entered_in_error", ctx do
      task = create_task(ctx) |> transition!(:ready, ctx) |> transition!(:start, ctx)

      assert {:ok, errored} = transition(task, :mark_entered_in_error, ctx)
      assert errored.status == :entered_in_error
    end
  end

  # ---------------------------------------------------------------------------
  # Destroy
  # ---------------------------------------------------------------------------

  describe "destroy" do
    test "destroys a task", ctx do
      task = create_task(ctx)

      assert :ok =
               task
               |> Ash.Changeset.for_destroy(:destroy, %{},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.destroy()

      assert {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} =
               Ash.get(Chironium.Health.Task, task.id,
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
    end

    test "nil actor is denied", ctx do
      task = create_task(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               task
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: nil, tenant: ctx.tenant)
               |> Ash.destroy()
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp create_task(ctx) do
    Chironium.Health.Task
    |> Ash.Changeset.for_create(
      :create,
      %{
        intent: :order,
        description: "Test task",
        requested_period: %{start: DateTime.add(DateTime.utc_now(), 1, :day)}
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp transition(task, action, ctx) do
    task
    |> Ash.Changeset.for_update(action, %{}, authorize?: false, tenant: ctx.tenant)
    |> Ash.update()
  end

  defp transition!(task, action, ctx) do
    task
    |> Ash.Changeset.for_update(action, %{}, authorize?: false, tenant: ctx.tenant)
    |> Ash.update!()
  end
end
