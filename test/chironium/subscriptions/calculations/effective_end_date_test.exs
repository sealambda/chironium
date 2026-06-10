defmodule Chironium.Subscriptions.Calculations.EffectiveEndDateTest do
  use ExUnit.Case, async: true

  alias Chironium.Subscriptions.Calculations.EffectiveEndDate

  # The calculation runs purely over already-loaded fields, so we exercise it by passing plain
  # maps shaped like a loaded subscription — no database or Ash query machinery required.
  defp end_date(record), do: hd(EffectiveEndDate.calculate([record], [], %{}))

  defp subscription(overrides) do
    base = %{
      start_date: ~D[2026-01-01],
      state: :active,
      plan: %{duration: %{code: :d, value: 30}},
      pauses: []
    }

    Map.merge(base, Map.new(overrides))
  end

  describe "calculate/3" do
    test "returns nil when the plan is missing" do
      assert end_date(subscription(plan: nil)) == nil
    end

    test "returns nil when the start date is missing" do
      assert end_date(subscription(start_date: nil)) == nil
    end

    test "adds a day-based plan duration to the start date" do
      assert end_date(subscription([])) == ~D[2026-01-31]
    end

    test "supports week, month, and year duration codes" do
      assert end_date(subscription(plan: %{duration: %{code: :wk, value: 2}})) == ~D[2026-01-15]
      assert end_date(subscription(plan: %{duration: %{code: :mo, value: 1}})) == ~D[2026-02-01]
      assert end_date(subscription(plan: %{duration: %{code: :a, value: 1}})) == ~D[2027-01-01]
    end

    test "extends the end date by the length of closed pauses" do
      record = subscription(pauses: [%{start_date: ~D[2026-01-05], end_date: ~D[2026-01-15]}])
      # 30-day plan ends 2026-01-31; a 10-day closed pause pushes it to 2026-02-10.
      assert end_date(record) == ~D[2026-02-10]
    end

    test "truncates a Decimal duration value to whole days" do
      record = subscription(plan: %{duration: %{code: :d, value: Decimal.new(30)}})
      assert end_date(record) == ~D[2026-01-31]
    end
  end
end
