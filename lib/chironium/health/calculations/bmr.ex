defmodule Chironium.Health.Calculations.Bmr do
  @moduledoc """
  Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation (1990).

  The Mifflin-St Jeor equation is currently the most accurate BMR formula for
  general populations, recommended by the American Dietetic Association.

  ## Formula

  - **Men**: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
  - **Women**: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161

  ## Requirements

  Requires the following data to calculate:
  - `weight_kg`: Weight in kilograms (from BiometricRecord)
  - `height_cm`: Height in centimeters (from BiometricRecord)
  - `age`: Age in years (from Person via Assignment)
  - `biological_sex`: MALE or FEMALE (from HealthProfile via Assignment)

  Returns `nil` if:
  - Any required field is missing
  - `biological_sex` is INTERSEX (formula not validated for intersex individuals)
  - Age is zero or negative

  ## Result

  BMR in kcal/day, rounded to the nearest whole number.

  ## Notes

  BMR represents the energy expenditure at complete rest. To estimate total daily
  energy expenditure (TDEE), multiply BMR by an activity factor:
  - Sedentary (little/no exercise): BMR × 1.2
  - Lightly active (1-3 days/week): BMR × 1.375
  - Moderately active (3-5 days/week): BMR × 1.55
  - Very active (6-7 days/week): BMR × 1.725
  - Super active (physical job + exercise): BMR × 1.9
  """
  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [
      :weight_kg,
      :height_cm,
      assignment: [
        person: [:age],
        membership: [person: [health_profile: [:biological_sex]]]
      ]
    ]
  end

  @impl true
  def calculate(records, _opts, _context) do
    Enum.map(records, &calculate_bmr/1)
  end

  # Missing required fields.
  defp calculate_bmr(%{weight_kg: nil}), do: nil
  defp calculate_bmr(%{height_cm: nil}), do: nil

  # Missing assignment or person data.
  defp calculate_bmr(%{assignment: nil}), do: nil
  defp calculate_bmr(%{assignment: %{person: nil}}), do: nil
  defp calculate_bmr(%{assignment: %{membership: nil}}), do: nil
  defp calculate_bmr(%{assignment: %{membership: %{person: nil}}}), do: nil
  defp calculate_bmr(%{assignment: %{membership: %{person: %{health_profile: nil}}}}), do: nil

  defp calculate_bmr(%{
         weight_kg: weight_kg,
         height_cm: height_cm,
         assignment: %{
           person: person,
           membership: %{person: %{health_profile: health_profile}}
         }
       }) do
    age = person.age
    biological_sex = health_profile.biological_sex

    # Cannot calculate without age or biological sex.
    if is_nil(age) or is_nil(biological_sex) or age <= 0 do
      nil
    else
      compute_mifflin_st_jeor(weight_kg, height_cm, age, biological_sex)
    end
  end

  # Fallback for any unexpected structure.
  defp calculate_bmr(_), do: nil

  @spec compute_mifflin_st_jeor(Decimal.t(), Decimal.t(), integer(), atom()) ::
          Decimal.t() | nil
  defp compute_mifflin_st_jeor(weight_kg, height_cm, age, biological_sex) do
    # Convert weight and height to Decimal if needed.
    weight = ensure_decimal(weight_kg)
    height = ensure_decimal(height_cm)
    age_decimal = Decimal.new(age)

    # Base calculation: 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years)
    base =
      "10"
      |> Decimal.new()
      |> Decimal.mult(weight)
      |> Decimal.add(Decimal.mult(Decimal.new("6.25"), height))
      |> Decimal.sub(Decimal.mult(Decimal.new("5"), age_decimal))

    # Add sex-specific constant.
    bmr =
      case biological_sex do
        :MALE -> Decimal.add(base, Decimal.new("5"))
        :FEMALE -> Decimal.sub(base, Decimal.new("161"))
        # Formula not validated for INTERSEX - return nil.
        :INTERSEX -> nil
      end

    if is_nil(bmr) do
      nil
    else
      # Round to nearest integer (BMR is typically reported as whole kcal/day).
      Decimal.round(bmr, 0)
    end
  end

  @spec ensure_decimal(Decimal.t() | number()) :: Decimal.t()
  defp ensure_decimal(%Decimal{} = decimal), do: decimal
  defp ensure_decimal(number) when is_number(number), do: Decimal.new(number)
end
