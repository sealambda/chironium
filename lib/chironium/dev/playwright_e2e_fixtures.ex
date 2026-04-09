defmodule Chironium.Dev.PlaywrightE2EFixtures do
  @moduledoc false
  # Dev-only helpers for Playwright. Called only from PlaywrightE2EController (secret-gated).

  require Ash.Query

  alias Chironium.Accounts.User

  def ensure_user!(email) when is_binary(email) do
    normalized = String.downcase(String.trim(email))

    case User
         |> Ash.Query.for_read(:get_by_email, %{email: normalized})
         |> Ash.read_one(authorize?: false) do
      {:ok, user} when not is_nil(user) ->
        user

      _ ->
        Ash.Seed.seed!(%User{email: normalized})
    end
  end
end
