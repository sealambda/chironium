defmodule ChironiumWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  are reverted at the end of every test. If you are using
  PostgreSQL, you can even run database tests asynchronously
  by setting `use ChironiumWeb.ConnCase, async: true`, although
  this option is not recommended for other databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # The default endpoint for testing
      @endpoint ChironiumWeb.Endpoint

      use ChironiumWeb, :verified_routes

      import ChironiumWeb.ConnCase
      import Phoenix.ConnTest
      # Import conveniences for testing with connections
      import Plug.Conn
    end
  end

  setup tags do
    Chironium.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  @vite_manifest {:chironium, "priv/static/.vite/manifest.json"}

  @doc """
  Lets pages that use the root layout render without built assets.

  The root layout reads the Vite manifest, which `mix test` runs without in CI
  (assets build later). Seeds PhoenixVite's manifest cache when it's missing.
  """
  def stub_vite_manifest(_context \\ %{}) do
    {app, path} = @vite_manifest

    unless app |> Application.app_dir(path) |> File.exists?() do
      entry = %{"file" => "assets/stub.js", "isEntry" => true}
      manifest = PhoenixVite.Manifest.parse(%{"src/main.tsx" => entry, "js/app.js" => entry})
      :persistent_term.put({PhoenixVite.Components, @vite_manifest}, manifest)

      ExUnit.Callbacks.on_exit(fn ->
        PhoenixVite.Components.clear_manifest_cache(@vite_manifest)
      end)
    end

    :ok
  end
end
