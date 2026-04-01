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
  def match?(
        _actor,
        %{query: %{context: %{accessing_from: %{source: _, relationship: _}}}},
        _opts
      ) do
    true
  end

  def match?(_, _, _), do: false
end
