defmodule Chironium.Secrets do
  use AshAuthentication.Secret

  def secret_for(
        [:authentication, :tokens, :signing_secret],
        Chironium.Accounts.User,
        _opts,
        _context
      ) do
    Application.fetch_env(:chironium, :token_signing_secret)
  end
end
