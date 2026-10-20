defmodule ChironiumWeb.AppUrl do
  @moduledoc """
  Absolute links into the single-page app, for emails and shareable links.
  """

  @doc """
  The endpoint URL plus the app's base path (`:app_url`, `/app` by default),
  `path` and `query`, for example `https://<host>/app/customers/<person_id>`.
  """
  @spec url(String.t(), Enumerable.t()) :: String.t()
  def url(path \\ "", query \\ %{}) do
    app_uri = URI.parse(Application.get_env(:chironium, :app_url, "/app"))

    params =
      Map.merge(
        URI.decode_query(app_uri.query || ""),
        Map.new(query, fn {key, value} -> {to_string(key), to_string(value)} end)
      )

    ChironiumWeb.Endpoint.url()
    |> URI.parse()
    |> Map.put(:path, Path.join(app_uri.path || "/app", path))
    |> Map.put(:query, if(params == %{}, do: nil, else: URI.encode_query(params)))
    |> URI.to_string()
  end
end
