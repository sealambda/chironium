defmodule Chironium.Secrets do
  @moduledoc """
  Secret provider for AshAuthentication.

  Retrieves secrets from application configuration at runtime
  for token signing and identity provider credentials.
  """
  use AshAuthentication.Secret

  # Token signing secret, shared by staff users and guest links.
  def secret_for(
        [:authentication, :tokens, :signing_secret],
        resource,
        _opts,
        _context
      )
      when resource in [Chironium.Accounts.User, Chironium.Accounts.GuestAccess] do
    Application.fetch_env(:chironium, :token_signing_secret)
  end

  # Google and OpenID Connect settings. `:error` when the provider is off, which
  # fails its sign-in instead of calling the provider with no credentials.
  def secret_for(
        [:authentication, :strategies, provider, key],
        Chironium.Accounts.User,
        _opts,
        _context
      )
      when provider in [:google, :oidc] do
    case get_in(Application.get_env(:chironium, :sign_in_providers, []), [provider, key]) do
      nil -> :error
      value -> {:ok, value}
    end
  end
end
