defmodule Chironium.Seed.Subscriptions do
  @moduledoc "Seed monthly/yearly subscription plans and random subscriptions for patients."

  alias Chironium.Subscriptions.{Plan, Subscription}
  alias Chironium.Seed.Tenant

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

  @doc """
  Create monthly/yearly plans and assign one active subscription per patient.

  Every subscription starts 1–18 months in the past and remains active.
  """
  def seed(tenant, patients) do
    ash_opts = Tenant.ash_opts(tenant)
    plans = create_plans!(ash_opts)
    today = Date.utc_today()

    created =
      patients
      |> Enum.map(& &1.person_id)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(fn person_id ->
        plan = Enum.random(plans)
        days = plan_duration_days(plan.duration)
        start_date = Date.add(today, -Enum.random(trunc(days * 0.20)..trunc(days * 0.80)))

        Subscription
        |> Ash.Changeset.for_create(
          :create,
          %{subscriber_id: person_id, plan_id: plan.id, start_date: start_date},
          ash_opts
        )
        |> Ash.create!()
      end)

    %{created: length(created), expired: 0, active: length(created)}
  end

  defp plan_duration_days(%{code: :mo, value: v}), do: trunc(to_float(v) * 30)
  defp plan_duration_days(%{code: :a, value: v}), do: trunc(to_float(v) * 365)
  defp plan_duration_days(_), do: 28

  defp to_float(%Decimal{} = d), do: Decimal.to_float(d)
  defp to_float(n) when is_number(n), do: n * 1.0

  defp create_plans!(ash_opts) do
    [@monthly_plan, @yearly_plan]
    |> Enum.map(fn attrs ->
      Plan
      |> Ash.Changeset.for_create(:create, attrs, ash_opts)
      |> Ash.create!()
    end)
  end
end
