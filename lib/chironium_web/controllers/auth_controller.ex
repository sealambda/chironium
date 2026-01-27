defmodule ChironiumWeb.AuthController do
  use ChironiumWeb, :controller
  use AshAuthentication.Phoenix.Controller

  alias ChironiumWeb.Plugs.AuthReturnState

  @spec success(
          Plug.Conn.t(),
          {atom(), atom()},
          Ash.Resource.record(),
          term()
        ) :: Plug.Conn.t()
  def success(conn, _activity, user, token) do
    # Get the validated return URL from the signed state token.
    # Falls back to configured pwa_url if no valid token exists.
    return_to = get_validated_return_url(conn)

    # For PWA/SPA on a different origin (development), include the auth token
    # in the redirect URL so the client can authenticate API requests.
    # In production (same origin), session cookies work normally.
    redirect_url = build_redirect_url(return_to, token)

    conn
    |> delete_session(:auth_return_state)
    |> store_in_session(user)
    # If your resource has a different name, update the assign name here (i.e :current_admin).
    |> assign(:current_user, user)
    |> redirect_to_pwa(redirect_url)
  end

  @spec failure(Plug.Conn.t(), {atom(), atom()}, term()) ::
          Plug.Conn.t()
  def failure(conn, activity, reason) do
    message =
      case {activity, reason} do
        {_,
         %AshAuthentication.Errors.AuthenticationFailed{
           caused_by: %Ash.Error.Forbidden{
             errors: [%AshAuthentication.Errors.CannotConfirmUnconfirmedUser{}]
           }
         }} ->
          """
          You have already signed in another way, but have not confirmed your account.
          You can confirm your account using the link we sent to you, or by resetting your password.
          """

        _ ->
          "Incorrect email or password"
      end

    conn
    |> put_flash(:error, message)
    |> redirect(to: ~p"/sign-in")
  end

  @spec sign_out(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def sign_out(conn, _params) do
    # On sign-out, always redirect to the configured PWA URL.
    # No need to validate state here since the user is ending their session.
    pwa_url = Application.get_env(:chironium, :pwa_url, "/app")

    conn
    |> clear_session(:chironium)
    |> put_flash(:info, "You are now signed out")
    |> redirect_to_pwa(pwa_url)
  end

  # Extract and validate the return URL from the signed state token.
  # Falls back to the configured pwa_url if no valid token is found.
  defp get_validated_return_url(conn) do
    pwa_url = Application.get_env(:chironium, :pwa_url, "/app")

    case get_session(conn, :auth_return_state) do
      nil ->
        pwa_url

      token ->
        case AuthReturnState.validate_state_token(token) do
          {:ok, return_url} ->
            return_url

          :error ->
            pwa_url
        end
    end
  end

  # Redirect to PWA URL, handling both external URLs (development) and internal paths (production).
  defp redirect_to_pwa(conn, url) when is_binary(url) do
    if String.starts_with?(url, "http://") or String.starts_with?(url, "https://") do
      redirect(conn, external: url)
    else
      redirect(conn, to: url)
    end
  end

  # Build the redirect URL, optionally including the auth token for cross-origin SPAs.
  # The token is passed as a URL fragment (#token=...) so it's not logged in server logs
  # and not sent to the server on subsequent requests.
  defp build_redirect_url(base_url, nil), do: base_url
  defp build_redirect_url(base_url, ""), do: base_url

  defp build_redirect_url(base_url, token) when is_binary(token) do
    # Only include token for external URLs (cross-origin SPA in development).
    # For same-origin paths, session cookies work fine.
    if String.starts_with?(base_url, "http://") or String.starts_with?(base_url, "https://") do
      # Validate token appears to be a JWT (three dot-separated segments).
      # This is a basic sanity check, not cryptographic validation.
      if valid_jwt_format?(token) do
        # Use URL fragment (#) instead of query param (?) for security:
        # - Fragments are not sent to the server in HTTP requests.
        # - Fragments are not logged in server access logs.
        # - The client can read it and clear it from the URL immediately.
        "#{base_url}#token=#{token}"
      else
        base_url
      end
    else
      base_url
    end
  end

  # Basic JWT format validation: three base64-encoded segments separated by dots.
  # This is not cryptographic validation, just format checking to avoid passing
  # malformed data to the client.
  defp valid_jwt_format?(token) when is_binary(token) do
    case String.split(token, ".") do
      [_header, _payload, _signature] -> true
      _ -> false
    end
  end
end
