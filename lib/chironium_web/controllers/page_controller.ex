defmodule ChironiumWeb.PageController do
  use ChironiumWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  def index conn, _params do
    render(conn, :index)
  end
end
