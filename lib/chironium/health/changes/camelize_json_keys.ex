defmodule Chironium.Health.Changes.CamelizeJsonKeys do
  @moduledoc """
  Recursively rewrite the keys of a JSON-tree attribute to FHIR's camelCase form.

  The FHIR `item`/`answer` trees are sent as typed GraphQL input objects. Absinthe
  coerces those into maps keyed by the field *identifier* — snake_case atoms such as
  `:link_id`, `:enable_when`, `:value_quantity`. The rest of the platform (storage,
  `ValidItemTree`, `NormalizeAnswerTree`, observation extraction) and FHIR itself use
  camelCase string keys (`"linkId"`, `"enableWhen"`, …). This change normalizes the
  coerced value up front so every downstream consumer sees the canonical shape.

  Runs as a plain change (not a `before_action` hook) so subsequent validations in the
  same action observe the normalized keys.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, opts, _context) do
    attribute = Keyword.fetch!(opts, :attribute)

    case Ash.Changeset.fetch_change(changeset, attribute) do
      {:ok, value} -> Ash.Changeset.change_attribute(changeset, attribute, camelize(value))
      :error -> changeset
    end
  end

  @doc "Recursively camelCase every map key in a decoded JSON value."
  def camelize(list) when is_list(list), do: Enum.map(list, &camelize/1)

  def camelize(%_{} = struct), do: struct

  def camelize(map) when is_map(map) do
    Map.new(map, fn {key, value} -> {camel_key(key), camelize(value)} end)
  end

  def camelize(other), do: other

  defp camel_key(key) when is_atom(key), do: key |> Atom.to_string() |> camel_key()

  defp camel_key(key) when is_binary(key) do
    case String.split(key, "_") do
      [first | rest] -> first <> Enum.map_join(rest, "", &String.capitalize/1)
      [] -> key
    end
  end
end
