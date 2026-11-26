defmodule ChironiumWeb.PageController do
  use ChironiumWeb, :controller

  def app(conn, _params) do
    # The root layout loads the React bundle only for the SPA shell.
    conn |> assign(:spa, true) |> render(:app)
  end
end
