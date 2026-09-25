defmodule ChironiumWeb.Plugs.PortalRateLimit do
  @moduledoc """
  Rate-limits the patient portal's entry points by client IP.

  Guest sign-in (`/auth/guest/*`), the confirm page and the portal API are
  reachable without an account, so they are throttled to slow down token
  guessing and abuse. Limits come from application config:

      config :chironium, ChironiumWeb.Plugs.PortalRateLimit,
        scale_ms: 60_000,
        sign_in_limit: 20,
        api_limit: 120
  """

  @behaviour Plug

  import Plug.Conn

  @sign_in_prefixes [["auth", "guest"], ["portal", "sign-in"]]

  @defaults [scale_ms: 60_000, sign_in_limit: 20, api_limit: 120]

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

    case ChironiumWeb.RateLimit.hit({bucket, client_ip(conn)}, config[:scale_ms], limit) do
      {:allow, _count} ->
        conn

      {:deny, retry_after_ms} ->
        conn
        |> put_resp_header("retry-after", Integer.to_string(div(retry_after_ms, 1000) + 1))
        |> send_resp(:too_many_requests, "Too many requests. Please wait a minute and try again.")
        |> halt()
    end
  end

  # Behind the load balancer every request shares `remote_ip`, so the first
  # `x-forwarded-for` hop identifies the client, as in `PostHog.Integrations.Plug`.
  defp client_ip(conn) do
    case get_req_header(conn, "x-forwarded-for") do
      [forwarded | _] -> forwarded |> String.split(",", parts: 2) |> hd() |> String.trim()
      [] -> conn.remote_ip |> :inet.ntoa() |> to_string()
    end
  end
end
