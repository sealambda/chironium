defmodule Chironium.Health.Validations.MenstrualCycleFemaleOnly do
  @moduledoc """
  Validates that menstrual cycle records are only created for biologically female users.

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

    if is_nil(assignment_id) do
      :ok
    else
      validate_female_biological_sex(assignment_id)
    end
  end

  defp validate_female_biological_sex(assignment_id) do
    # Load assignment with membership -> person -> health_profile to get biological_sex.
    membership_query =
      Chironium.Services.Assignment
      |> Ash.Query.for_read(:read)
      |> Ash.Query.filter(expr(id == ^assignment_id))
      |> Ash.Query.load(membership: [person: [:health_profile]])

    case Ash.read_one(membership_query, authorize?: false) do
      {:ok, nil} -> :ok
      {:ok, assignment} -> check_biological_sex(assignment)
      {:error, _} -> :ok
    end
  end

  defp check_biological_sex(assignment) do
    biological_sex =
      case assignment.membership do
        %{person: %{health_profile: %{biological_sex: sex}}} when not is_nil(sex) -> sex
        _ -> nil
      end

    case biological_sex do
      :FEMALE -> :ok
      nil -> :ok
      _ -> {:error, field: :assignment_id, message: "requires a biologically female user"}
    end
  end
end
