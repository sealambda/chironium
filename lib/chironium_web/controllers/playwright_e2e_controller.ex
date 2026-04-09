defmodule ChironiumWeb.PlaywrightE2EController do
  @moduledoc """
  Development-only session bootstrap for Playwright E2E tests.

  Google OAuth is not automatable without third-party secrets; this endpoint
  creates a browser session for an existing user record when `PLAYWRIGHT_E2E_SECRET` matches.
  """

  use ChironiumWeb, :controller
  use AshAuthentication.Phoenix.Controller

  alias AshAuthentication.Jwt
  alias Chironium.Dev.PlaywrightE2EFixtures

  require Ash.Query

  defp secret_ok?(conn) do
    expected = Application.get_env(:chironium, :playwright_e2e_secret)

    cond do
      is_nil(expected) or expected == "" ->
        false

      true ->
        got = List.first(get_req_header(conn, "x-playwright-e2e-secret"))

        got != nil and byte_size(expected) == byte_size(got) and
          Plug.Crypto.secure_compare(expected, got)
    end
  end

  def ensure_user(conn, params) do
    if not secret_ok?(conn) do
      forbidden(conn)
    else
      email = params["email"]

      if not is_binary(email) or String.trim(email) == "" do
        conn |> put_status(:bad_request) |> text(~s(Missing "email" in JSON body.))
      else
        PlaywrightE2EFixtures.ensure_user!(email)
        conn |> put_status(:no_content) |> send_resp(204, "")
      end
    end
  end

  def create(conn, params) do
    if not secret_ok?(conn) do
      forbidden(conn)
    else
      email = params["email"]

      if not is_binary(email) or email == "" do
        conn |> put_status(:bad_request) |> text(~s(Missing "email" in JSON body.))
      else
        case fetch_user(email) do
          {:ok, user} ->
            case Jwt.token_for_user(user, %{}, [authorize?: false], %{}) do
              {:ok, token, _claims} ->
                meta = Map.put(user.__metadata__ || %{}, :token, token)
                user_with_token = struct(user, %{__metadata__: meta})

                conn
                |> store_in_session(user_with_token)
                |> put_status(:no_content)
                |> send_resp(204, "")

              :error ->
                conn
                |> put_status(:internal_server_error)
                |> text("Failed to issue session token for E2E user.")
            end

          :not_found ->
            conn
            |> put_status(:not_found)
            |> text(
              "User not found for email #{email}. POST /dev/playwright/user with that email first."
            )
        end
      end
    end
  end

  @impl AshAuthentication.Phoenix.Controller
  def sign_out(conn, _params) do
    conn
    |> put_status(:no_content)
    |> send_resp(204, "")
  end

  defp forbidden(conn), do: conn |> put_status(:forbidden) |> text("Forbidden")

  defp fetch_user(email) do
    Chironium.Accounts.User
    |> Ash.Query.for_read(:get_by_email, %{email: email})
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> :not_found
      {:ok, user} -> {:ok, user}
      _ -> :not_found
    end
  end
end
