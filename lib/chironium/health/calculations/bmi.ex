defmodule Chironium.Health.Calculations.Bmi do
  @moduledoc """
  Calculates Body Mass Index (BMI) from weight and height.

  Formula: weight_kg / (height_m)²

  Returns `nil` if weight or height is missing or zero.
  Result is rounded to 2 decimal places.
  """
  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [:weight_kg, :height_cm]
  end

  @impl true
  def calculate(records, _opts, _context) do
    Enum.map(records, &calculate_bmi/1)
  end

  defp calculate_bmi(%{weight_kg: nil}), do: nil
  defp calculate_bmi(%{height_cm: nil}), do: nil

  defp calculate_bmi(%{weight_kg: weight_kg, height_cm: height_cm}) do
    if Decimal.equal?(height_cm, Decimal.new("0")) do
      nil
    else
      height_m = Decimal.div(height_cm, Decimal.new("100"))
      height_sq = Decimal.mult(height_m, height_m)

      weight_kg
      |> Decimal.div(height_sq)
      |> Decimal.round(2)
    end
  end
end
