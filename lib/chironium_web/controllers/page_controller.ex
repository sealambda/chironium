defmodule ChironiumWeb.PageController do
  use ChironiumWeb, :controller

  def app(conn, _params) do
    render(conn, :app)
  end
end
