defmodule ChironiumWeb.Plugs.PortalRateLimit do
  @moduledoc """
  Rate-limits the patient portal's entry points and emailed sign-in links by client IP.

  Guest sign-in (`/auth/guest/*`), the confirm page, the portal API and staff
  email sign-in (`/auth/user/magic_link/*`) are reachable without an account, so
  they are throttled to slow down token guessing and email flooding. Limits come from application config:

      config :chironium, ChironiumWeb.Plugs.PortalRateLimit,
        scale_ms: 60_000,
        sign_in_limit: 20,
        api_limit: 120,
        trusted_proxies: 1

  `trusted_proxies` is how many reverse proxies sit in front of the app. Each
  one appends the address it received the request from to `x-forwarded-for`,
  so the client is the entry that many places from the right; entries further
  left are client-supplied and ignored. With `0`, `remote_ip` is used.
  """

  @behaviour Plug

  import Plug.Conn

  @sign_in_prefixes [["auth", "guest"], ["portal", "sign-in"], ["auth", "user", "magic_link"]]

  @defaults [scale_ms: 60_000, sign_in_limit: 20, api_limit: 120, trusted_proxies: 1]

  @impl true
  def init(opts), do: opts

  @impl true
  def call(%Plug.Conn{path_info: path_info} = conn, _opts) do
    case bucket(path_info) do
      nil -> conn
      bucket -> check(conn, bucket)
    end
  end

  defp bucket(["portal", "gql" | _]), do: :api

  defp bucket(path_info) do
    if Enum.any?(@sign_in_prefixes, &List.starts_with?(path_info, &1)), do: :sign_in
  end

  defp check(conn, bucket) do
    config = Keyword.merge(@defaults, Application.get_env(:chironium, __MODULE__, []))
    limit = Keyword.fetch!(config, :"#{bucket}_limit")

    client = client_ip(conn, config[:trusted_proxies])

    case ChironiumWeb.RateLimit.hit({bucket, client}, config[:scale_ms], limit) do
      {:allow, _count} ->
        conn

      {:deny, retry_after_ms} ->
        conn
        |> put_resp_header("retry-after", Integer.to_string(div(retry_after_ms, 1000) + 1))
        |> send_resp(:too_many_requests, "Too many requests. Please wait a minute and try again.")
        |> halt()
    end
  end

  defp client_ip(conn, trusted_proxies) when trusted_proxies > 0 do
    hops =
      conn
      |> get_req_header("x-forwarded-for")
      |> Enum.flat_map(&String.split(&1, ","))
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))

    # Fewer hops than proxies means a proxy was bypassed: fall back to the oldest.
    Enum.at(hops, -trusted_proxies) || List.first(hops) || remote_ip(conn)
  end

  defp client_ip(conn, _trusted_proxies), do: remote_ip(conn)

  defp remote_ip(conn), do: conn.remote_ip |> :inet.ntoa() |> to_string()
end
