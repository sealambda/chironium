defmodule ChironiumWeb.AshTypescriptRpcController do
  use ChironiumWeb, :controller

  @spec run(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def run(conn, params) do
    result = AshTypescript.Rpc.run_action(:chironium, conn, params)
    json(conn, result)
  end

  @spec validate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def validate(conn, params) do
    result = AshTypescript.Rpc.validate_action(:chironium, conn, params)
    json(conn, result)
  end
end
