defmodule Chironium.CRM.Checks.AccessedFromRelationship do
  @moduledoc """
  Authorizes reads that arrive through a relationship load from any resource.

  When Ash loads a relationship (e.g. `Patient → :person`), it annotates the
  inner query with `accessing_from` context. This check passes whenever that
  annotation is present, regardless of the source resource.

  Using this instead of the built-in `accessing_from/2` avoids a compile-time
  reference from CRM to downstream domains (e.g. Health).
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "accessed via a relationship from another resource"

  @impl true
  def match?(_actor, %{query: %Ash.Query{} = query}, _opts) do
    match?({:context, query.context})
  end

  def match?(_actor, %{changeset: %Ash.Changeset{} = changeset}, _opts) do
    match?({:context, changeset.context})
  end

  def match?(_, _, _), do: false

  defp match?({:context, %{accessing_from: %{source: _, name: _}}}), do: true
  defp match?(_), do: false
end
