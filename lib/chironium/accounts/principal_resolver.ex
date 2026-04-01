defmodule Chironium.Accounts.PrincipalResolver do
  @moduledoc """
  Behaviour for resolving a domain principal from a PrincipalGrant.

  Each domain that exposes principal types implements this behaviour and
  registers itself in application config under
  `config :chironium, Chironium.Accounts.ActorResolver`.

  This keeps the Accounts domain decoupled from downstream domains
  (Health, CRM, etc.) while still supporting polyglot principal resolution.
  """

  @doc """
  Loads a principal by ID and attaches audit metadata.

  `principal_id` is the primary key of the first matching grant.
  `all_ids` contains all active grant IDs for the same principal type
  (useful for multi-practitioner users). `user` is the authenticated
  `%User{}` — implementations should store it as metadata on the returned
  struct so audit trails can reference the underlying human.

  Returns `{:ok, principal_struct}` on success or `:error` when the
  principal cannot be found (e.g. soft-deleted).
  """
  @callback resolve(
              principal_id :: String.t(),
              all_ids :: [String.t()],
              user :: struct(),
              tenant :: String.t()
            ) :: {:ok, struct()} | :error
end
