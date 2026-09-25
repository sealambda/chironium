defmodule ChironiumWeb.PortalHTML do
  @moduledoc """
  Pages rendered by `ChironiumWeb.PortalController`.
  """

  use ChironiumWeb, :html

  embed_templates "portal_html/*"

  @doc "Formats a date for the confirm page in the current locale."
  def format_date(%DateTime{} = datetime, locale) do
    date = DateTime.to_date(datetime)

    case Chironium.Cldr.Date.to_string(date, format: :long, locale: locale || "en") do
      {:ok, formatted} -> formatted
      {:error, _} -> Date.to_iso8601(date)
    end
  end
end
