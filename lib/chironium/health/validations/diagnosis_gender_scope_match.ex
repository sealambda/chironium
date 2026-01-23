defmodule Chironium.Health.Validations.DiagnosisGenderScopeMatch do
  @moduledoc """
  Validates that a diagnosis pathology matches the patient's biological sex.

  Ensures gender-specific pathologies (e.g., MALE_ONLY, FEMALE_ONLY)
  are only assigned to patients of the appropriate biological sex.

  Uses HealthProfile.biological_sex for validation instead of Person.gender.
  """
  use Ash.Resource.Validation

  import Ash.Expr

  @impl true
  def atomic?, do: false

  @impl true
  def supports(_opts), do: [Ash.Changeset]

  @impl true
  def validate(changeset, _opts, _context) do
    assignment_id =
      Ash.Changeset.get_attribute(changeset, :assignment_id) || changeset.data.assignment_id

    pathology_id =
      Ash.Changeset.get_attribute(changeset, :pathology_id) || changeset.data.pathology_id

    if is_nil(assignment_id) || is_nil(pathology_id) do
      :ok
    else
      validate_gender_scope(assignment_id, pathology_id)
    end
  end

  defp validate_gender_scope(assignment_id, pathology_id) do
    # Load assignment with membership -> person -> health_profile to get biological_sex.
    assignment_query =
      Chironium.Services.Assignment
      |> Ash.Query.for_read(:read)
      |> Ash.Query.filter(expr(id == ^assignment_id))
      |> Ash.Query.load(membership: [person: [:health_profile]])

    pathology_query =
      Chironium.Health.PathologyCatalog
      |> Ash.Query.for_read(:read)
      |> Ash.Query.filter(expr(id == ^pathology_id))

    with {:ok, assignment} when not is_nil(assignment) <-
           Ash.read_one(assignment_query, authorize?: false),
         {:ok, pathology} when not is_nil(pathology) <-
           Ash.read_one(pathology_query, authorize?: false) do
      biological_sex = get_biological_sex(assignment)
      check_scope_match(biological_sex, pathology.gender_scope)
    else
      _ -> :ok
    end
  end

  defp get_biological_sex(assignment) do
    case assignment.membership do
      %{person: %{health_profile: %{biological_sex: sex}}} when not is_nil(sex) -> sex
      _ -> nil
    end
  end

  defp check_scope_match(nil, _scope), do: :ok
  defp check_scope_match(_sex, :BOTH), do: :ok
  defp check_scope_match(:MALE, :MALE_ONLY), do: :ok
  defp check_scope_match(:FEMALE, :FEMALE_ONLY), do: :ok

  defp check_scope_match(_sex, _scope) do
    {:error, field: :pathology_id, message: "biological sex does not match pathology scope"}
  end
end
