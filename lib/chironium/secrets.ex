defmodule Chironium.Secrets do
  @moduledoc """
  Secret provider for AshAuthentication.

  Retrieves secrets from application configuration at runtime
  for token signing and OAuth provider credentials.
  """
  use AshAuthentication.Secret

  @spec secret_for(
          secret_path :: [atom()],
          resource :: module(),
          opts :: keyword(),
          context :: map()
        ) :: {:ok, String.t() | nil} | :error
  # Token signing secret.
  def secret_for(
        [:authentication, :tokens, :signing_secret],
        Chironium.Core.Identity.User,
        _opts,
        _context
      ) do
    Application.fetch_env(:chironium, :token_signing_secret)
  end

  # Google OAuth client ID.
  def secret_for(
        [:authentication, :strategies, :google, :client_id],
        Chironium.Core.Identity.User,
        _opts,
        _context
      ) do
    case Application.fetch_env(:chironium, ChironiumWeb.Endpoint) do
      {:ok, config} -> {:ok, get_in(config, [:google_oauth, :client_id])}
      error -> error
    end
  end

  # Google OAuth client secret.
  def secret_for(
        [:authentication, :strategies, :google, :client_secret],
        Chironium.Core.Identity.User,
        _opts,
        _context
      ) do
    case Application.fetch_env(:chironium, ChironiumWeb.Endpoint) do
      {:ok, config} -> {:ok, get_in(config, [:google_oauth, :client_secret])}
      error -> error
    end
  end

  # Google OAuth redirect URI.
  def secret_for(
        [:authentication, :strategies, :google, :redirect_uri],
        Chironium.Core.Identity.User,
        _opts,
        _context
      ) do
    case Application.fetch_env(:chironium, ChironiumWeb.Endpoint) do
      {:ok, config} -> {:ok, get_in(config, [:google_oauth, :redirect_uri])}
      error -> error
    end
  end
end
