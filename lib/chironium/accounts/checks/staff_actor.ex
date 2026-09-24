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

  @impl true
  def match?(%Chironium.Accounts.User{}, _context, _opts), do: true

  # Matched by struct name so Accounts takes no compile-time dependency on Health.
  def match?(%{__struct__: Chironium.Health.Practitioner}, _context, _opts), do: true

  def match?(_actor, _context, _opts), do: false
end
