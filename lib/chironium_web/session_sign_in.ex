defmodule ChironiumWeb.SessionSignIn do
  @moduledoc """
  Signs a user in by writing the session directly, without an authentication
  strategy. Used by the demo and the development-only sign-in endpoints.
  """

  import AshAuthentication.Plug.Helpers, only: [store_in_session: 2]

  alias AshAuthentication.Jwt

  @doc "Mints a token for `user` and stores it in the session."
  @spec sign_in(Plug.Conn.t(), struct()) :: {:ok, Plug.Conn.t()} | :error
  def sign_in(conn, user) do
    case Jwt.token_for_user(user, %{}, [authorize?: false], %{}) do
      {:ok, token, _claims} ->
        user = struct(user, %{__metadata__: Map.put(user.__metadata__ || %{}, :token, token)})
        {:ok, store_in_session(conn, user)}

      :error ->
        :error
    end
  end
end
