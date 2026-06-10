defmodule ChironiumWeb.Plugs.CheckCodegenStatus do
  @moduledoc """
  Runs `AshPhoenix.Plug.CheckCodegenStatus` for normal requests.

  Skips the check for Playwright E2E traffic (dev bootstrap routes and browser requests carrying
  the configured Playwright secret) so automation is not blocked by pending codegen prompts.
  """

  @behaviour Plug

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(%Plug.Conn{path_info: ["dev", "playwright" | _]} = conn, _opts), do: conn

  def call(conn, _opts) do
    if valid_playwright_secret_header?(conn) do
      conn
    else
      AshPhoenix.Plug.CheckCodegenStatus.call(conn, [])
    end
  end

  defp valid_playwright_secret_header?(conn) do
    expected = Application.get_env(:chironium, :playwright_e2e_secret)
    got = conn |> Plug.Conn.get_req_header("x-playwright-e2e-secret") |> List.first()

    is_binary(expected) and expected != "" and is_binary(got) and
      byte_size(expected) == byte_size(got) and
      Plug.Crypto.secure_compare(expected, got)
  end
end
