defmodule ChironiumWeb.ViteDevProxyPlug do
  @moduledoc """
  Development-only plug that proxies specific assets from Vite dev server to Phoenix.

  This allows the frontend to use relative URLs that work identically in both
  development (proxied to Vite at localhost:5173) and production (served by Phoenix
  from priv/static/).

  ## Proxied Paths

  | Pattern                            | Purpose                |
  | ---------------------------------- | ---------------------- |
  | `/locales/{lang}/{namespace}.json` | i18n translation files |

  ## Architecture

  This plug is registered in `ChironiumWeb.Endpoint` (not the router) because:

  1. Endpoint plugs run before the router, enabling early interception
  2. Follows Phoenix conventions for static/proxy asset handling

  ## Security

  - Only proxies to localhost addresses (localhost, 127.0.0.1, ::1)
  - Validates content types match expected file extensions
  - Never active in production (guarded by `code_reloading?` in endpoint)

  ## Production

  In production, these files are built into `priv/static/` and served by `Plug.Static`.
  This plug is only mounted when `code_reloading?` is true.
  """

  import Plug.Conn
  require Logger

  @behaviour Plug

  # Allowed localhost hosts for security
  @allowed_hosts ~w[localhost 127.0.0.1 ::1]

  # Content type mappings by file extension
  @content_types %{
    ".json" => ["application/json"]
  }

  @impl Plug
  @spec init(keyword()) :: keyword()
  def init(opts), do: opts

  @impl Plug
  @spec call(Plug.Conn.t(), keyword()) :: Plug.Conn.t()
  def call(conn, _opts) do
    path = conn.request_path

    if locale_file?(path) do
      proxy_to_vite(conn, path)
    else
      conn
    end
  end

  # --- Path Matchers ---

  defp locale_file?(path) do
    String.starts_with?(path, "/locales/") and String.ends_with?(path, ".json")
  end

  # --- Proxy Logic ---

  defp proxy_to_vite(conn, path) do
    with {:ok, base_url} <- get_vite_dev_url(),
         url = build_url(base_url, path, conn.query_string),
         {:ok, body, content_type} <- fetch_from_vite(url, path) do
      Logger.debug("Proxied Vite asset: #{path}")

      conn
      |> put_standard_headers(content_type)
      |> send_resp(200, body)
      |> halt()
    else
      {:error, :invalid_dev_url, reason} ->
        Logger.error("Invalid Vite dev server URL: #{inspect(reason)}")
        halt_with_error(conn, 502, "Vite dev server unavailable")

      {:error, :fetch_failed, reason} ->
        Logger.error("Failed to proxy #{path} from Vite: #{inspect(reason)}")
        halt_with_error(conn, 502, "Vite dev server unavailable")

      {:error, :unexpected_status, status} ->
        Logger.warning("Vite dev server returned #{status} for #{path}")
        halt_with_error(conn, status, "Vite dev server returned #{status}")

      {:error, :invalid_content_type, content_type} ->
        Logger.warning("Unexpected content type #{inspect(content_type)} for #{path}")
        halt_with_error(conn, 502, "Vite dev server returned unexpected content")
    end
  end

  defp build_url(base_url, path, ""), do: base_url <> path
  defp build_url(base_url, path, query), do: base_url <> path <> "?" <> query

  defp fetch_from_vite(url, path) do
    case Req.get(url, retry: false, max_redirects: 0) do
      {:ok, %{status: 200, body: body, headers: headers}} ->
        content_type = extract_content_type(headers, path)

        if valid_content_type?(content_type, path) do
          {:ok, body, content_type}
        else
          {:error, :invalid_content_type, content_type}
        end

      {:ok, %{status: status}} ->
        {:error, :unexpected_status, status}

      {:error, reason} ->
        {:error, :fetch_failed, reason}
    end
  end

  # --- Response Helpers ---

  defp put_standard_headers(conn, content_type) do
    conn
    |> put_resp_header("content-type", content_type)
    |> put_resp_header("cache-control", "no-store, no-cache, must-revalidate")
    |> put_resp_header("x-content-type-options", "nosniff")
    |> put_resp_header("x-proxied-from", "vite-dev-server")
  end

  defp halt_with_error(conn, status, message) do
    conn
    |> put_resp_header("content-type", "text/plain; charset=utf-8")
    |> put_resp_header("x-content-type-options", "nosniff")
    |> send_resp(status, message)
    |> halt()
  end

  # --- Content Type Handling ---

  defp extract_content_type(headers, path) do
    headers
    |> Enum.find_value(fn {key, value} ->
      if String.downcase(key) == "content-type", do: value
    end)
    |> normalize_content_type(path)
  end

  defp normalize_content_type(nil, path), do: guess_content_type(path)
  defp normalize_content_type([first | _], _path), do: first
  defp normalize_content_type(value, _path) when is_binary(value), do: value

  defp guess_content_type(path) do
    case Path.extname(path) do
      ".json" -> "application/json"
      _ -> "application/octet-stream"
    end
  end

  defp valid_content_type?(content_type, path) do
    normalized =
      content_type
      |> String.split(";")
      |> List.first()
      |> String.trim()
      |> String.downcase()

    ext = Path.extname(path)
    allowed = Map.get(@content_types, ext, [])

    normalized in allowed
  end

  # --- Vite Dev Server URL ---

  defp get_vite_dev_url do
    url = build_dev_server_url()

    case URI.parse(url) do
      %URI{scheme: scheme, host: host}
      when scheme in ["http", "https"] and host in @allowed_hosts ->
        {:ok, url}

      %URI{scheme: scheme, host: host} ->
        {:error, :invalid_dev_url, {:disallowed_host, scheme, host}}
    end
  end

  defp build_dev_server_url do
    config = Application.get_env(:chironium, ChironiumWeb.Endpoint, [])
    static_url = Keyword.get(config, :static_url, [])

    scheme = Keyword.get(static_url, :scheme, "http")
    host = Keyword.get(static_url, :host, "localhost")
    port = Keyword.get(static_url, :port, 5173)

    "#{scheme}://#{host}:#{port}"
  end
end
