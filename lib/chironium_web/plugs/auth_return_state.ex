defmodule ChironiumWeb.Plugs.AuthReturnState do
  @moduledoc """
  Plug to securely capture the referrer origin for post-authentication redirects.

  Instead of trusting a user-provided `return_to` query parameter, this plug:
  1. Extracts the Referer header to identify where the user came from.
  2. Validates the origin against a configurable allowlist of PWA origins.
  3. Generates a signed, time-limited state token containing the validated return URL.
  4. Stores the token in the session for use after authentication.

  This prevents open redirect vulnerabilities while supporting deep links
  back to the PWA after authentication.

  ## Configuration

  Configure allowed PWA origins in your environment config:

      # config/dev.exs
      config :chironium, :allowed_pwa_origins, ["http://localhost:5173"]

      # config/runtime.exs (production)
      config :chironium,
        allowed_pwa_origins: System.get_env("ALLOWED_PWA_ORIGINS", "")
                             |> String.split(",", trim: true)
                             |> Enum.map(&String.trim/1)

  ## Security

  - Only origins in the allowlist are accepted.
  - State tokens are signed with the app's secret key base.
  - Tokens expire after 10 minutes to prevent replay attacks.
  - Falls back to configured `pwa_url` if no valid referrer is found.
  """

  import Plug.Conn

  @behaviour Plug

  # Token validity period: 10 minutes.
  @token_max_age_seconds 600

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    # Only process for sign-in related paths, and only if we don't already have state.
    # This prevents overwriting the original return URL when the user interacts
    # with the sign-in page (e.g., clicking OAuth buttons).
    if should_capture_return?(conn) and not has_existing_state?(conn) do
      capture_return_state(conn)
    else
      conn
    end
  end

  # Only capture state for authentication entry points.
  defp should_capture_return?(conn) do
    conn.request_path in ["/sign-in", "/register", "/reset"]
  end

  # Check if we already have a valid state token in session.
  defp has_existing_state?(conn) do
    case get_session(conn, :auth_return_state) do
      nil -> false
      token -> validate_state_token(token) != :error
    end
  end

  defp capture_return_state(conn) do
    case extract_valid_return_url(conn) do
      {:ok, return_url} ->
        # Generate a signed state token with the validated return URL.
        token = generate_state_token(return_url)
        put_session(conn, :auth_return_state, token)

      :error ->
        # No valid referrer found; AuthController will use pwa_url fallback.
        conn
    end
  end

  defp extract_valid_return_url(conn) do
    allowed_origins = Application.get_env(:chironium, :allowed_pwa_origins, [])

    with [referer | _] <- get_req_header(conn, "referer"),
         {:ok, referer_uri} <- parse_uri(referer),
         origin <- build_origin(referer_uri),
         true <- origin in allowed_origins do
      # Return the full referer URL (includes path for deep links).
      {:ok, referer}
    else
      _ -> :error
    end
  end

  defp parse_uri(url) do
    case URI.parse(url) do
      %URI{scheme: scheme, host: host} when not is_nil(scheme) and not is_nil(host) ->
        {:ok, URI.parse(url)}

      _ ->
        :error
    end
  end

  defp build_origin(%URI{scheme: scheme, host: host, port: port}) do
    # Include port only if non-standard.
    default_port = if scheme == "https", do: 443, else: 80

    if port && port != default_port do
      "#{scheme}://#{host}:#{port}"
    else
      "#{scheme}://#{host}"
    end
  end

  defp generate_state_token(return_url) do
    payload = %{
      return_url: return_url,
      issued_at: System.system_time(:second)
    }

    Phoenix.Token.sign(ChironiumWeb.Endpoint, "auth_return_state", payload)
  end

  @doc """
  Validates and extracts the return URL from a state token.

  Returns `{:ok, return_url}` if valid, `:error` otherwise.
  Called by AuthController after successful authentication.
  """
  @spec validate_state_token(String.t()) :: {:ok, String.t()} | :error
  def validate_state_token(token) when is_binary(token) do
    case Phoenix.Token.verify(
           ChironiumWeb.Endpoint,
           "auth_return_state",
           token,
           max_age: @token_max_age_seconds
         ) do
      {:ok, %{return_url: return_url}} when is_binary(return_url) ->
        {:ok, return_url}

      _ ->
        :error
    end
  end

  def validate_state_token(_), do: :error
end
