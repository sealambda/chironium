defmodule Chironium.Health.Validations.MacroCalorieBalance do
  @moduledoc """
  Validates that macro nutrients sum to approximately the target calories.

  Uses standard caloric values:
  - Protein: 4 kcal/g
  - Carbohydrates: 4 kcal/g
  - Fats: 9 kcal/g

  Allows a tolerance of ±50 kcals from the target.
  """
  use Ash.Resource.Validation

  @impl true
  def atomic?, do: false

  @impl true
  def supports(_opts), do: [Ash.Changeset]

  @impl true
  def validate(changeset, _opts, _context) do
    protein = Ash.Changeset.get_attribute(changeset, :protein_gr)
    carbs = Ash.Changeset.get_attribute(changeset, :carbs_gr)
    fats = Ash.Changeset.get_attribute(changeset, :fats_gr)
    target = Ash.Changeset.get_attribute(changeset, :target_kcals)

    if Enum.any?([protein, carbs, fats, target], &is_nil/1) do
      :ok
    else
      total = protein * 4 + carbs * 4 + fats * 9
      diff = abs(total - target)

      if diff <= 50 do
        :ok
      else
        {:error,
         field: :target_kcals, message: "macro calories must be within 50 kcals of target"}
      end
    end
  end
end
