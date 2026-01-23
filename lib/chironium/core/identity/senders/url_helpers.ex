defmodule Chironium.Core.Identity.Senders.UrlHelpers do
  @moduledoc """
  Shared URL building utilities for email senders.

  Provides helper functions to construct base URLs from application configuration,
  handling different schemes, hosts, and ports appropriately for email links.
  """

  @doc """
  Returns the base URL for the application.

  Constructs the base URL from the ChironiumWeb.Endpoint configuration,
  handling different port scenarios appropriately.

  ## Examples

      iex> get_base_url()
      "http://localhost:4000"

  """
  @spec get_base_url() :: String.t()
  def get_base_url do
    case Application.get_env(:chironium, ChironiumWeb.Endpoint) do
      nil ->
        "http://localhost:4000"

      config ->
        url_config = Keyword.get(config, :url, [])
        scheme = Keyword.get(url_config, :scheme, "http")
        host = Keyword.get(url_config, :host, "localhost")
        port = Keyword.get(url_config, :port, 4000)

        case port do
          80 -> "#{scheme}://#{host}"
          443 -> "#{scheme}://#{host}"
          port -> "#{scheme}://#{host}:#{port}"
        end
    end
  end
end
