defmodule ChironiumWeb.Plugs.CheckCodegenStatus do
  @moduledoc """
  Runs Ash's pending-codegen guard for normal requests, with two exceptions:

    * Playwright E2E traffic (the dev bootstrap routes and browser requests
      carrying the configured Playwright secret) is skipped so automation is not
      blocked by pending-codegen prompts.

    * The **AshGraphql SDL** check is excluded. `auto_generate_sdl_file?: true`
      rewrites `priv/schema.graphql` on every compile, and Absinthe's SDL output
      is not field-order stable, so the on-disk file never matches what the check
      regenerates — a perpetual false positive that 500s the dev server. The SDL
      is a derived artifact consumed only by gql.tada, where field order is
      irrelevant. **Database (AshPostgres) migration codegen is still enforced.**

  This mirrors `AshPhoenix.Plug.CheckCodegenStatus`, minus the skipped extensions.
  """

  @behaviour Plug

  # Extensions whose pending codegen must not block requests (see @moduledoc).
  @skipped_codegen_extensions [AshGraphql.Resource]

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(%Plug.Conn{path_info: ["dev", "playwright" | _]} = conn, _opts), do: conn

  def call(conn, _opts) do
    if valid_playwright_secret_header?(conn) do
      conn
    else
      check_pending_codegen(conn)
    end
  end

  defp check_pending_codegen(conn) do
    extensions =
      (:persistent_term.get(:ash_codegen_extensions, nil) || set_extensions()) --
        @skipped_codegen_extensions

    extensions
    |> Enum.flat_map(fn extension ->
      try do
        if function_exported?(extension, :codegen, 1) do
          extension.codegen(["--dev", "--check"])
        end

        []
      rescue
        e in Ash.Error.Framework.PendingCodegen ->
          Enum.to_list(e.diff)

        _ ->
          []
      end
    end)
    |> case do
      [] ->
        conn

      diff ->
        {:current_stacktrace, stack} = Process.info(self(), :current_stacktrace)

        Plug.Conn.WrapperError.reraise(
          conn,
          :error,
          Ash.Error.Framework.PendingCodegen.exception(diff: diff, explain: true),
          Enum.drop(stack, 1)
        )
    end
  end

  defp set_extensions do
    extensions = Ash.Mix.Tasks.Helpers.extensions!([])
    :persistent_term.put(:ash_codegen_extensions, extensions)
    extensions
  end

  defp valid_playwright_secret_header?(conn) do
    expected = Application.get_env(:chironium, :playwright_e2e_secret)
    got = conn |> Plug.Conn.get_req_header("x-playwright-e2e-secret") |> List.first()

    is_binary(expected) and expected != "" and is_binary(got) and
      byte_size(expected) == byte_size(got) and
      Plug.Crypto.secure_compare(expected, got)
  end
end
