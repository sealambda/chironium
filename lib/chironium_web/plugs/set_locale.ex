defmodule ChironiumWeb.Plugs.SetLocale do
  @moduledoc """
  Sets the Gettext locale for the current request.

  Resolution order:
  1. `x-chironium-locale` request header (sent by the frontend).
  2. `PARAGLIDE_LOCALE` cookie (written by Paraglide on the client).
  3. `Accept-Language` header (browser default).
  4. Fallback to `"es"`.
  """
  @behaviour Plug

  @locale_header "x-chironium-locale"
  @locale_cookie "PARAGLIDE_LOCALE"
  @supported_locales ~w(en es)
  @fallback_locale "en"

  def init(opts), do: opts

  def call(conn, _opts) do
    locale =
      from_header(conn) ||
        from_cookie(conn) ||
        from_accept_language(conn) ||
        @fallback_locale

    Gettext.put_locale(ChironiumWeb.Gettext, locale)
    Plug.Conn.assign(conn, :locale, locale)
  end

  @doc """
  Passes the request's locale to a LiveView session. The connected LiveView runs in
  another process and can't read cookies, so without it the page falls back to English.
  """
  def live_session(conn), do: %{"locale" => conn.assigns[:locale]}

  defp from_header(conn) do
    conn
    |> Plug.Conn.get_req_header(@locale_header)
    |> List.first()
    |> validate_locale()
  end

  defp from_cookie(conn) do
    conn.cookies[@locale_cookie]
    |> validate_locale()
  end

  # Parse the first matching locale from the Accept-Language header.
  defp from_accept_language(conn) do
    conn
    |> Plug.Conn.get_req_header("accept-language")
    |> List.first()
    |> parse_accept_language()
  end

  defp parse_accept_language(nil), do: nil

  defp parse_accept_language(header) do
    header
    |> String.split(",")
    |> Enum.map(fn part ->
      part |> String.split(";") |> List.first() |> String.trim() |> String.downcase()
    end)
    |> Enum.find_value(fn tag ->
      # Match "es-AR" → "es", "en-US" → "en", or exact "en"/"es".
      lang = tag |> String.split("-") |> List.first()
      validate_locale(lang)
    end)
  end

  defp validate_locale(locale) when locale in @supported_locales, do: locale
  defp validate_locale(_), do: nil
end
