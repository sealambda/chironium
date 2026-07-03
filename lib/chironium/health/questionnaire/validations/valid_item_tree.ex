defmodule Chironium.Health.Questionnaire.Validations.ValidItemTree do
  @moduledoc """
  Validates a `Questionnaire.item` JSON tree: every node has a non-empty `linkId` and a
  recognized `type`, `linkId`s are unique across the whole tree, `enableWhen` entries
  reference an existing `linkId` with a known operator and exactly one `answer[x]`,
  `answerOption` entries carry exactly one value, and `minValue`/`maxValue` bounds
  form a sane range.

  A draft questionnaire may have no items yet, so an empty/absent tree is valid.
  Keys follow FHIR's JSON form (camelCase strings).
  """

  use Ash.Resource.Validation

  alias Chironium.Health.Questionnaire.ItemType

  @impl true
  def validate(changeset, _opts, _context) do
    items = Ash.Changeset.get_attribute(changeset, :item) || []

    with :ok <- validate_list(items),
         link_ids = collect_link_ids(items),
         :ok <- validate_unique_link_ids(link_ids),
         :ok <- validate_enable_when(items, MapSet.new(link_ids)) do
      :ok
    else
      {:error, message} -> {:error, field: :item, message: message}
    end
  end

  defp validate_list(items) when is_list(items) do
    Enum.reduce_while(items, :ok, fn item, :ok ->
      case validate_node(item) do
        :ok -> {:cont, :ok}
        error -> {:halt, error}
      end
    end)
  end

  defp validate_list(_), do: {:error, "item must be a list"}

  defp validate_node(%{} = node) do
    type = node["type"]

    cond do
      blank?(node["linkId"]) ->
        {:error, "every item needs a non-empty linkId"}

      not ItemType.valid?(type) ->
        {:error, "item #{node["linkId"]} has an unknown type #{inspect(type)}"}

      ItemType.structural?(type) == false and not is_nil(node["item"]) and node["item"] != [] ->
        {:error, "non-group item #{node["linkId"]} may not contain child items"}

      true ->
        with :ok <- validate_answer_options(node),
             :ok <- validate_bounds(node),
             :ok <- validate_list(node["item"] || []) do
          :ok
        end
    end
  end

  defp validate_node(_), do: {:error, "each item must be an object"}

  defp validate_answer_options(%{"answerOption" => options}) when is_list(options) do
    Enum.reduce_while(options, :ok, fn option, :ok ->
      value_keys = option |> Map.keys() |> Enum.filter(&String.starts_with?(&1, "value"))

      case value_keys do
        [_one] -> {:cont, :ok}
        _ -> {:halt, {:error, "each answerOption must carry exactly one value"}}
      end
    end)
  end

  defp validate_answer_options(_), do: :ok

  # `minValue`/`maxValue` (the flattened FHIR extensions) must form a sane numeric range.
  defp validate_bounds(%{"linkId" => link_id} = node) do
    min = node["minValue"]
    max = node["maxValue"]

    cond do
      not (is_nil(min) or is_number(min)) or not (is_nil(max) or is_number(max)) ->
        {:error, "minValue/maxValue on #{link_id} must be numbers"}

      is_number(min) and is_number(max) and min >= max ->
        {:error, "minValue must be below maxValue on #{link_id}"}

      true ->
        :ok
    end
  end

  defp validate_unique_link_ids(link_ids) do
    duplicates = link_ids -- Enum.uniq(link_ids)

    case duplicates do
      [] -> :ok
      [dup | _] -> {:error, "duplicate linkId #{dup}"}
    end
  end

  @enable_operators ~w(exists = != > < >= <=)

  defp validate_enable_when(items, link_ids) do
    Enum.reduce_while(items, :ok, fn node, :ok ->
      conditions = node["enableWhen"] || []

      with :ok <- validate_conditions(conditions, node["linkId"], link_ids),
           :ok <- validate_enable_when(node["item"] || [], link_ids) do
        {:cont, :ok}
      else
        error -> {:halt, error}
      end
    end)
  end

  defp validate_conditions(conditions, link_id, link_ids) do
    Enum.reduce_while(conditions, :ok, fn condition, :ok ->
      answer_keys =
        condition
        |> Map.keys()
        |> Enum.filter(&(String.starts_with?(&1, "answer") and not is_nil(condition[&1])))

      cond do
        not MapSet.member?(link_ids, condition["question"]) ->
          {:halt, {:error, "enableWhen on #{link_id} references unknown question"}}

        condition["operator"] not in @enable_operators ->
          {:halt,
           {:error,
            "enableWhen on #{link_id} has an unknown operator #{inspect(condition["operator"])}"}}

        length(answer_keys) != 1 ->
          {:halt, {:error, "enableWhen on #{link_id} must carry exactly one answer value"}}

        true ->
          {:cont, :ok}
      end
    end)
  end

  defp collect_link_ids(items) do
    Enum.flat_map(items, fn node ->
      [node["linkId"] | collect_link_ids(node["item"] || [])]
    end)
  end

  defp blank?(nil), do: true
  defp blank?(value) when is_binary(value), do: String.trim(value) == ""
  defp blank?(_), do: false
end
