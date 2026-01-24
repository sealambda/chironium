defmodule ChironiumWeb.PageController do
  use ChironiumWeb, :controller

  @spec home(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def home(conn, _params) do
    render(conn, :home)
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    render(conn, :index)
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def app(conn, _params) do
    render(conn, :app)
  end
end
