defmodule Chironium.Health.Task.Calculations.RequesterName do
  @moduledoc """
  The requesting practitioner's display name.

  Loaded without authorization so a patient can see who asked, while the
  Practitioner resource itself stays closed to them.
  """

  use Ash.Resource.Calculation

  require Ash.Query

  alias Chironium.Health.Practitioner
  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def load(_query, _opts, _context), do: [:requester_practitioner_id]

  @impl true
  def calculate(tasks, _opts, context) do
    ids = tasks |> Enum.map(& &1.requester_practitioner_id) |> Enum.reject(&is_nil/1)

    names =
      Practitioner
      |> Ash.Query.filter(id in ^ids)
      |> Ash.read!(tenant: context.tenant, authorize?: false)
      |> Map.new(&{&1.id, QuestionnaireRequests.display_name(&1.name)})

    Enum.map(tasks, &Map.get(names, &1.requester_practitioner_id))
  end
end
