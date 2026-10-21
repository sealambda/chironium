defmodule Chironium.Subscriptions.SubscriptionPauseTest do
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator

  alias Chironium.Subscriptions.Subscription
  alias Chironium.Subscriptions.SubscriptionPause

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    plan =
      Chironium.Subscriptions.Plan
      |> Ash.Changeset.for_create(
        :create,
        %{
          name: "Monthly",
          duration: %{value: 1, code: :mo},
          price_amount: %{amount: "49.99", currency: :EUR}
        },
        actor: owner,
        tenant: tenant,
        authorize?: false
      )
      |> Ash.create!()

    %{owner: owner, tenant: tenant, plan: plan}
  end

  # --- Helpers ---------------------------------------------------------------

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(
      :create_patient_with_person,
      %{
        person: %{
          name: [
            %{
              use: :official,
              family: Faker.Person.last_name(),
              given: [Faker.Person.first_name()]
            }
          ],
          gender: :other
        }
      },
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_subscription(ctx, opts \\ []) do
    patient = create_patient(ctx)
    start_date = Keyword.get(opts, :start_date, Date.utc_today())

    Subscription
    |> Ash.Changeset.for_create(
      :create,
      %{subscriber_id: patient.person_id, plan_id: ctx.plan.id, start_date: start_date},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp suspend(sub, ctx, opts \\ []) do
    args =
      case Keyword.fetch(opts, :reason) do
        {:ok, r} -> %{reason: r}
        :error -> %{}
      end

    args =
      case Keyword.fetch(opts, :suspended_at) do
        {:ok, d} -> Map.put(args, :suspended_at, d)
        :error -> args
      end

    sub
    |> Ash.Changeset.for_update(:suspend, args,
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.update!()
  end

  defp resume(sub, ctx, opts \\ []) do
    args =
      case Keyword.fetch(opts, :end_date) do
        {:ok, d} -> %{end_date: d}
        :error -> %{}
      end

    sub
    |> Ash.Changeset.for_update(:resume, args,
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.update!()
  end

  defp cancel(sub, ctx, opts \\ []) do
    args =
      case Keyword.fetch(opts, :end_date) do
        {:ok, d} -> %{end_date: d}
        :error -> %{}
      end

    sub
    |> Ash.Changeset.for_update(:cancel, args,
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.update!()
  end

  defp load_with_pauses(sub, ctx) do
    Ash.load!(sub, [:pauses, :effective_end_date],
      tenant: ctx.tenant,
      authorize?: false
    )
  end

  # --- State machine transitions ----------------------------------------------

  describe "suspend/resume state transitions" do
    test "suspending an active subscription moves it to :suspended", ctx do
      sub = create_subscription(ctx)
      assert sub.state == :active

      sub = suspend(sub, ctx)
      assert sub.state == :suspended
    end

    test "resuming a suspended subscription moves it back to :active", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -2))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -1))
      sub = resume(sub, ctx)
      assert sub.state == :active
    end

    test "cannot suspend an already suspended subscription", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)

      assert_raise Ash.Error.Invalid, ~r/state transition.*suspend/i, fn ->
        suspend(sub, ctx)
      end
    end

    test "can cancel a suspended subscription", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -2))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -1))
      sub = cancel(sub, ctx)
      assert sub.state == :canceled
    end

    test "can cancel an active subscription without a pause", ctx do
      sub = create_subscription(ctx)
      sub = cancel(sub, ctx)
      assert sub.state == :canceled
    end
  end

  # --- Pause record management -----------------------------------------------

  describe "pause record lifecycle" do
    test "suspending creates an open SubscriptionPause record", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert length(sub.pauses) == 1
      pause = hd(sub.pauses)
      assert pause.subscription_id == sub.id
      assert is_nil(pause.end_date)
      assert %Date{} = pause.start_date
    end

    test "pause records the given reason", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx, reason: "Travelling abroad")
      sub = load_with_pauses(sub, ctx)

      assert hd(sub.pauses).reason == "Travelling abroad"
    end

    test "pause reason can be omitted", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert is_nil(hd(sub.pauses).reason)
    end

    test "records the given suspended_at as the pause start_date", ctx do
      sub = create_subscription(ctx, start_date: ~D[2025-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2025-06-01])
      sub = load_with_pauses(sub, ctx)

      assert hd(sub.pauses).start_date == ~D[2025-06-01]
    end

    test "defaults pause start_date to today when suspended_at is omitted", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert hd(sub.pauses).start_date == Date.utc_today()
    end

    test "resuming closes the open pause", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -2))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -1))
      sub = resume(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert length(sub.pauses) == 1
      assert %Date{} = hd(sub.pauses).end_date
    end

    test "resuming records the given end_date on the pause", ctx do
      sub = create_subscription(ctx, start_date: ~D[2025-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2025-06-01])
      sub = resume(sub, ctx, end_date: ~D[2025-06-15])
      sub = load_with_pauses(sub, ctx)

      pause = hd(sub.pauses)
      assert pause.start_date == ~D[2025-06-01]
      assert pause.end_date == ~D[2025-06-15]
    end

    test "canceling records the given end_date on the open pause", ctx do
      sub = create_subscription(ctx, start_date: ~D[2025-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2025-06-01])
      sub = cancel(sub, ctx, end_date: ~D[2025-06-20])
      sub = load_with_pauses(sub, ctx)

      pause = hd(sub.pauses)
      assert pause.start_date == ~D[2025-06-01]
      assert pause.end_date == ~D[2025-06-20]
    end

    test "multiple pause/resume cycles accumulate pause records", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -5))

      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -4))
      sub = resume(sub, ctx, end_date: Date.add(Date.utc_today(), -3))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -2))
      sub = resume(sub, ctx, end_date: Date.add(Date.utc_today(), -1))

      sub = load_with_pauses(sub, ctx)
      assert length(sub.pauses) == 2
      assert Enum.all?(sub.pauses, &(not is_nil(&1.end_date)))
    end

    test "canceling a suspended subscription closes the open pause", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -2))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -1))
      sub = cancel(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert length(sub.pauses) == 1
      assert %Date{} = hd(sub.pauses).end_date
    end

    test "canceling an active subscription leaves no pause records", ctx do
      sub = create_subscription(ctx)
      sub = cancel(sub, ctx)
      sub = load_with_pauses(sub, ctx)

      assert sub.pauses == []
    end
  end

  # --- effective_end_date calculation ----------------------------------------

  describe "effective_end_date" do
    test "equals start_date + plan duration when never paused", ctx do
      sub =
        create_subscription(ctx, start_date: ~D[2026-01-15])
        |> load_with_pauses(ctx)

      assert sub.effective_end_date == ~D[2026-02-15]
    end

    test "shifts forward by the number of paused days after resume", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-15])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])
      # 3 days
      sub = resume(sub, ctx, end_date: ~D[2026-01-18])
      sub = load_with_pauses(sub, ctx)

      assert sub.effective_end_date == ~D[2026-02-18]
    end

    test "accounts for an ongoing pause in the effective end date", ctx do
      # Suspended 10 days ago; end date must shift by at least 10 days.
      start_date = ~D[2026-01-15]
      baseline_end = Date.shift(start_date, month: 1)
      suspended_at = Date.add(Date.utc_today(), -10)

      sub = create_subscription(ctx, start_date: start_date)
      sub = suspend(sub, ctx, suspended_at: suspended_at)
      sub = load_with_pauses(sub, ctx)

      assert Date.diff(sub.effective_end_date, baseline_end) >= 10
    end

    test "multiple pause cycles shift end date by total paused days", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-15])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])
      # 2 days
      sub = resume(sub, ctx, end_date: ~D[2026-01-17])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-20])
      # 3 days
      sub = resume(sub, ctx, end_date: ~D[2026-01-23])
      sub = load_with_pauses(sub, ctx)

      # 2 + 3 = 5 extra days
      assert sub.effective_end_date == ~D[2026-02-20]
    end

    test "works for a subscription created in the past", ctx do
      past_start = Date.add(Date.utc_today(), -365)
      expected_end = Date.shift(past_start, month: 1)

      sub = create_subscription(ctx, start_date: past_start) |> load_with_pauses(ctx)

      assert sub.effective_end_date == expected_end
    end

    test "works for a subscription created with a future start date", ctx do
      future_start = Date.add(Date.utc_today(), 30)
      expected_end = Date.shift(future_start, month: 1)

      sub = create_subscription(ctx, start_date: future_start) |> load_with_pauses(ctx)

      assert sub.effective_end_date == expected_end
    end
  end

  # --- Uniqueness constraint on open pauses ----------------------------------

  describe "destroy" do
    test "deleting a pause archives it instead of removing the row", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx, reason: "To be deleted")

      pause =
        SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^sub.id)
        |> Ash.read_one!(tenant: ctx.tenant, authorize?: false)

      assert :ok =
               pause
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: ctx.owner, tenant: ctx.tenant)
               |> Ash.destroy()

      assert SubscriptionPause
             |> Ash.Query.filter(id == ^pause.id)
             |> Ash.read_one(tenant: ctx.tenant, authorize?: false) == {:ok, nil}
    end

    test "archiving an open pause frees the one-open-pause slot", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)

      pause =
        SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^sub.id and is_nil(end_date))
        |> Ash.read_one!(tenant: ctx.tenant, authorize?: false)

      assert :ok =
               pause
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: ctx.owner, tenant: ctx.tenant)
               |> Ash.destroy()

      assert {:ok, _} =
               SubscriptionPause
               |> Ash.Changeset.for_create(
                 :open,
                 %{subscription_id: sub.id, start_date: Date.utc_today()},
                 tenant: ctx.tenant,
                 authorize?: false
               )
               |> Ash.create()
    end
  end

  describe "uniqueness constraint" do
    test "cannot open a second pause while one is already open", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx)

      assert_raise Ash.Error.Invalid, fn ->
        SubscriptionPause
        |> Ash.Changeset.for_create(
          :open,
          %{subscription_id: sub.id, start_date: Date.utc_today()},
          tenant: ctx.tenant,
          authorize?: false
        )
        |> Ash.create!()
      end
    end
  end

  # --- Validation: end_date must be after start_date -------------------------

  describe "pause end_date validation" do
    test "closing a pause with end_date equal to start_date is rejected", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-01])
      _sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])

      open_pause =
        SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^sub.id and is_nil(end_date))
        |> Ash.read_one!(tenant: ctx.tenant, authorize?: false)

      assert_raise Ash.Error.Invalid, ~r/after the pause start date/i, fn ->
        open_pause
        |> Ash.Changeset.for_update(:close, %{end_date: ~D[2026-01-15]},
          tenant: ctx.tenant,
          authorize?: false
        )
        |> Ash.update!()
      end
    end

    test "closing a pause with end_date before start_date is rejected", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-01])
      _sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])

      open_pause =
        SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^sub.id and is_nil(end_date))
        |> Ash.read_one!(tenant: ctx.tenant, authorize?: false)

      assert_raise Ash.Error.Invalid, ~r/after the pause start date/i, fn ->
        open_pause
        |> Ash.Changeset.for_update(:close, %{end_date: ~D[2026-01-10]},
          tenant: ctx.tenant,
          authorize?: false
        )
        |> Ash.update!()
      end
    end
  end

  # --- Validation: suspended_at constraints ----------------------------------

  describe "suspended_at validation" do
    test "suspended_at before subscription start_date is rejected", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-15])

      assert_raise Ash.Error.Invalid, ~r/before the subscription start date/i, fn ->
        suspend(sub, ctx, suspended_at: ~D[2026-01-14])
      end
    end

    test "suspended_at equal to subscription start_date is accepted", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-15])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])
      sub = load_with_pauses(sub, ctx)

      assert hd(sub.pauses).start_date == ~D[2026-01-15]
    end

    test "suspended_at in the future is rejected", ctx do
      sub = create_subscription(ctx)
      tomorrow = Date.add(Date.utc_today(), 1)

      assert_raise Ash.Error.Invalid, ~r/cannot be in the future/i, fn ->
        suspend(sub, ctx, suspended_at: tomorrow)
      end
    end

    test "suspended_at today is accepted", ctx do
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx, suspended_at: Date.utc_today())
      assert sub.state == :suspended
    end
  end

  # --- Validation: resume end_date constraints --------------------------------

  describe "resume end_date validation" do
    test "end_date in the future is accepted when after pause start", ctx do
      pause_start = Date.utc_today()
      sub = create_subscription(ctx)
      sub = suspend(sub, ctx, suspended_at: pause_start)
      future_end = Date.add(pause_start, 180)

      sub = resume(sub, ctx, end_date: future_end)
      sub = load_with_pauses(sub, ctx)

      assert sub.state == :active
      assert hd(sub.pauses).end_date == future_end
    end

    test "end_date equal to pause start_date is rejected", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])

      assert_raise Ash.Error.Invalid, ~r/after the pause start date/i, fn ->
        resume(sub, ctx, end_date: ~D[2026-01-15])
      end
    end

    test "end_date before pause start_date is rejected", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])

      assert_raise Ash.Error.Invalid, ~r/after the pause start date/i, fn ->
        resume(sub, ctx, end_date: ~D[2026-01-10])
      end
    end

    test "end_date after pause start_date is accepted", ctx do
      sub = create_subscription(ctx, start_date: ~D[2026-01-01])
      sub = suspend(sub, ctx, suspended_at: ~D[2026-01-15])
      sub = resume(sub, ctx, end_date: ~D[2026-01-20])
      sub = load_with_pauses(sub, ctx)

      assert sub.state == :active
      assert hd(sub.pauses).end_date == ~D[2026-01-20]
    end

    test "end_date today is accepted", ctx do
      sub = create_subscription(ctx, start_date: Date.add(Date.utc_today(), -5))
      sub = suspend(sub, ctx, suspended_at: Date.add(Date.utc_today(), -2))
      sub = resume(sub, ctx, end_date: Date.utc_today())

      assert sub.state == :active
    end
  end
end
