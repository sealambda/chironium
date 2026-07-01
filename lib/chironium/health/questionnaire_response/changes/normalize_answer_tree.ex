defmodule Chironium.Health.QuestionnaireResponse.Changes.NormalizeAnswerTree do
  @moduledoc """
  Makes the server authoritative for the response tree.

  Loads the linked `Questionnaire`, then walks the submitted answer tree to: reject
  `linkId`s that do not exist in the definition, check each `answer.value[x]` is the
  single value key allowed for its question `type`, and re-stamp each item's `text`
  from the definition so the stored snapshot is server-truth rather than client-supplied.
  Runs as a `before_action` because it depends on a cross-resource load.
  """

  use Ash.Resource.Change

  alias Chironium.Health.Questionnaire
  alias Chironium.Health.Questionnaire.ItemType

  @impl Ash.Resource.Change
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, &normalize/1)
  end

  defp normalize(changeset) do
    questionnaire_id = Ash.Changeset.get_attribute(changeset, :questionnaire_id)
    answers = Ash.Changeset.get_attribute(changeset, :item) || []

    case load_questionnaire(changeset, questionnaire_id) do
      {:ok, questionnaire} ->
        index = index_items(questionnaire.item || [])

        case normalize_nodes(answers, index) do
          {:ok, normalized} ->
            Ash.Changeset.force_change_attribute(changeset, :item, normalized)

          {:error, message} ->
            Ash.Changeset.add_error(changeset, field: :item, message: message)
        end

      {:error, _reason} ->
        Ash.Changeset.add_error(changeset,
          field: :questionnaire_id,
          message: "Linked questionnaire not found."
        )
    end
  end

  defp load_questionnaire(_changeset, nil), do: {:error, :no_questionnaire}

  defp load_questionnaire(changeset, questionnaire_id) do
    Ash.get(Questionnaire, questionnaire_id, tenant: changeset.tenant, authorize?: false)
  end

  # Flatten the definition into linkId => question-item so lookups are O(1).
  defp index_items(items) do
    Enum.reduce(items, %{}, fn item, acc ->
      acc
      |> Map.put(item["linkId"], item)
      |> Map.merge(index_items(item["item"] || []))
    end)
  end

  defp normalize_nodes(nodes, index) do
    Enum.reduce_while(nodes, {:ok, []}, fn node, {:ok, acc} ->
      case normalize_node(node, index) do
        {:ok, normalized} -> {:cont, {:ok, [normalized | acc]}}
        error -> {:halt, error}
      end
    end)
    |> case do
      {:ok, normalized} -> {:ok, Enum.reverse(normalized)}
      error -> error
    end
  end

  defp normalize_node(%{} = node, index) do
    link_id = node["linkId"]

    case Map.fetch(index, link_id) do
      :error ->
        {:error, "answer references unknown linkId #{inspect(link_id)}"}

      {:ok, definition} ->
        with :ok <- validate_answers(node["answer"] || [], definition["type"], link_id),
             {:ok, children} <- normalize_nodes(node["item"] || [], index) do
          normalized =
            node
            |> Map.put("text", definition["text"])
            |> put_unless_empty("item", children)

          {:ok, normalized}
        end
    end
  end

  defp normalize_node(_node, _index), do: {:error, "each answer item must be an object"}

  defp validate_answers(answers, type, link_id) do
    allowed = ItemType.answer_keys(type)

    Enum.reduce_while(answers, :ok, fn answer, :ok ->
      value_keys = answer |> Map.keys() |> Enum.filter(&String.starts_with?(&1, "value"))

      cond do
        value_keys == [] ->
          {:cont, :ok}

        length(value_keys) > 1 ->
          {:halt, {:error, "answer for #{link_id} sets more than one value"}}

        hd(value_keys) not in allowed ->
          {:halt,
           {:error, "answer #{hd(value_keys)} is not valid for a #{type} question (#{link_id})"}}

        true ->
          {:cont, :ok}
      end
    end)
  end

  defp put_unless_empty(map, _key, []), do: map
  defp put_unless_empty(map, key, value), do: Map.put(map, key, value)
end
