defmodule ChironiumWeb.Plugs.RequirePersistedDocument do
  @moduledoc """
  Rejects GraphQL requests that don't reference a persisted document by `id`.

  Absinthe would otherwise fail without a document provider to handle them.
  """

  @behaviour Plug

  import Plug.Conn

  @impl true
  def init(opts), do: opts

  @impl true
  def call(%Plug.Conn{params: %{"id" => id} = params} = conn, _opts)
      when is_binary(id) and not is_map_key(params, "query"),
      do: conn

  def call(conn, _opts) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(
      :bad_request,
      Jason.encode!(%{errors: [%{message: "Only persisted documents are accepted."}]})
    )
    |> halt()
  end
end
