defmodule Chironium.Accounts.Checks.StaffActor do
  @moduledoc """
  Authorizes staff actors: a `%User{}` (power users, members without grants)
  or a `%Practitioner{}` resolved from a principal grant.

  Use it instead of `actor_present()`, which any actor passes, including a
  `%Patient{}` signed in through the patient portal.
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "actor is a staff user or practitioner"

  # Match by struct name, not `%Resource{}`: Ash evaluates policy checks at compile time,
  # so a struct pattern on a resource that uses this check is a compile-time cycle.
  @impl true
  def match?(%{__struct__: Chironium.Accounts.User}, _context, _opts), do: true

  def match?(%{__struct__: Chironium.Health.Practitioner}, _context, _opts), do: true

  def match?(_actor, _context, _opts), do: false
end
