defmodule Chironium.Terminology.Concept.FilterByContext do
  @moduledoc """
  Ash preparation that narrows a concept search query by clinical context.

  When the `:context` argument is present the preparation:
  1. Restricts results to concepts whose code system URL matches the context.
  2. If the context defines a root ancestor code, further restricts results
     to concepts that are descendants of that ancestor in the closure table.
  """

  use Ash.Resource.Preparation

  alias Chironium.Terminology.ContextMapper

  @impl true
  def prepare(query, _opts, _context) do
    case Ash.Query.get_argument(query, :context) do
      nil ->
        query

      context ->
        case ContextMapper.get(context) do
          {:ok, %{system: system, parent_code: parent_code}} ->
            query
            |> Ash.Query.filter(code_system.url == ^system)
            |> filter_by_ancestor(parent_code)

          :error ->
            # The ConceptContext enum type prevents invalid values from reaching
            # here, but we guard anyway for defensive correctness.
            Ash.Query.add_error(
              query,
              Ash.Error.Query.InvalidArgument.exception(
                field: :context,
                message: "Unrecognized context: #{inspect(context)}."
              )
            )
        end
    end
  end

  defp filter_by_ancestor(query, nil), do: query

  defp filter_by_ancestor(query, parent_code) do
    # `ancestor_closures` is the has_many on Concept pointing to ConceptClosure
    # rows where this concept is the descendant. `ancestor` is the belongs_to on
    # ConceptClosure pointing back to the ancestor Concept via parent_id.
    Ash.Query.filter(query, exists(ancestor_closures, ancestor.code == ^parent_code))
  end
end
