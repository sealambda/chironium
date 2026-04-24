defmodule Chironium.Subscriptions.Calculations.EffectiveEndDate do
  @moduledoc """
  Calculates the effective end date of a subscription by adding the plan
  duration and all paused days to the start date.

  Paused days are derived directly from pause records:
  - Closed pauses contribute `end_date - start_date` days each.
  - The open pause (state `:suspended`) contributes `today - start_date` days.

  The result shifts the plan's natural end date forward by the total number
  of paused days, so customers never lose service time to pauses.
  """

  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [:start_date, :state, plan: [:duration], pauses: [:start_date, :end_date]]
  end

  @impl true
  def calculate(records, _opts, _context) do
    Enum.map(records, &compute/1)
  end

  defp compute(%{plan: nil}), do: nil
  defp compute(%{start_date: nil}), do: nil

  defp compute(subscription) do
    base_end = add_plan_duration(subscription.start_date, subscription.plan.duration)
    paused_days = total_paused_days(subscription.pauses, subscription.state)
    Date.add(base_end, paused_days)
  end

  defp total_paused_days(pauses, state) do
    today = Date.utc_today()

    Enum.reduce(pauses, 0, fn pause, acc ->
      cond do
        not is_nil(pause.end_date) ->
          acc + max(0, Date.diff(pause.end_date, pause.start_date))

        state == :suspended ->
          acc + max(0, Date.diff(today, pause.start_date))

        true ->
          acc
      end
    end)
  end

  # Adds a FHIR Duration to a Date using calendar-aware arithmetic where
  # possible (months, years), falling back to fixed-length days otherwise.
  defp add_plan_duration(date, %{code: :d, value: v}),
    do: Date.add(date, trunc_decimal(v))

  defp add_plan_duration(date, %{code: :wk, value: v}),
    do: Date.add(date, trunc_decimal(v) * 7)

  defp add_plan_duration(date, %{code: :mo, value: v}),
    do: Date.shift(date, month: trunc_decimal(v))

  defp add_plan_duration(date, %{code: :a, value: v}),
    do: Date.shift(date, year: trunc_decimal(v))

  defp add_plan_duration(date, _), do: date

  defp trunc_decimal(%Decimal{} = d), do: d |> Decimal.to_float() |> trunc()
  defp trunc_decimal(n) when is_number(n), do: trunc(n)
end
