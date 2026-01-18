defmodule ChironiumWeb.AshTypescriptRpcController do
  use ChironiumWeb, :controller

  def run(conn, params) do
    result = AshTypescript.Rpc.run_action(:chironium, conn, params)
    json(conn, result)
  end

  def validate(conn, params) do
    result = AshTypescript.Rpc.validate_action(:chironium, conn, params)
    json(conn, result)
  end
end
