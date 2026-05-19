defmodule Mix.Tasks.Chironium.Seed.Subscriptions do
  @moduledoc "Seed monthly/yearly subscription plans and random subscriptions for patients."
  @shortdoc "Seed subscriptions"

  use Mix.Task

  alias Chironium.Subscriptions.{Plan, Subscription}
  alias Mix.Tasks.Chironium.Seed.Helpers

  @monthly_plan %{
    name: "Monthly",
    duration: %{value: 1, code: :mo},
    price_amount: %{amount: "49.99", currency: :EUR}
  }

  @yearly_plan %{
    name: "Yearly",
    duration: %{value: 1, code: :a},
    price_amount: %{amount: "499.99", currency: :EUR}
  }

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)
    result = seed(tenant, patients)

    Helpers.info(
      "[Seed] Subscriptions created: #{result.created} " <>
        "(expired: #{result.expired}, active: #{result.active})."
    )
  end

  @doc "Create monthly/yearly plans and assign one random subscription to each seeded patient."
  def seed(tenant, patients) do
    ash_opts = Helpers.ash_opts(tenant)
    plans = create_plans!(ash_opts)

    subscriptions =
      patients
      |> Enum.map(& &1.person_id)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(fn person_id ->
        plan = Enum.random(plans)

        Subscription
        |> Ash.Changeset.for_create(
          :create,
          %{subscriber_id: person_id, plan_id: plan.id, start_date: Date.utc_today()},
          ash_opts
        )
        |> Ash.create!()
      end)

    expired_count = min(2, length(subscriptions))

    subscriptions
    |> Enum.take_random(expired_count)
    |> Enum.each(fn subscription ->
      subscription
      |> Ash.Changeset.for_update(:expire, %{}, ash_opts)
      |> Ash.update!()
    end)

    %{
      created: length(subscriptions),
      expired: expired_count,
      active: length(subscriptions) - expired_count
    }
  end

  defp create_plans!(ash_opts) do
    [@monthly_plan, @yearly_plan]
    |> Enum.map(fn attrs ->
      Plan
      |> Ash.Changeset.for_create(:create, attrs, ash_opts)
      |> Ash.create!()
    end)
  end
end
