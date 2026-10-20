defmodule ChironiumWeb.PageControllerTest do
  # The email flag is global application env.
  use ChironiumWeb.ConnCase, async: false

  import Chironium.Generator

  @manifest {:chironium, "priv/static/.vite/manifest.json"}

  setup %{conn: conn} do
    stub_vite_manifest()
    {:ok, token, _claims} = AshAuthentication.Jwt.token_for_user(generate(user()))
    {:ok, conn: conn |> Plug.Test.init_test_session(%{}) |> put_session("user_token", token)}
  end

  test "tells the SPA that email is on", %{conn: conn} do
    assert conn |> get(~p"/app") |> html_response(200) =~
             ~s(<meta name="chironium:email-enabled" content="true")
  end

  test "tells the SPA that email is off", %{conn: conn} do
    Chironium.DataCase.disable_email()

    assert conn |> get(~p"/app") |> html_response(200) =~
             ~s(<meta name="chironium:email-enabled" content="false")
  end

  # The root layout reads the Vite manifest, which `mix test` runs without in
  # CI (assets build later). Seed PhoenixVite's manifest cache when it's missing.
  defp stub_vite_manifest do
    {app, path} = @manifest

    unless app |> Application.app_dir(path) |> File.exists?() do
      entry = %{"file" => "assets/stub.js", "isEntry" => true}
      manifest = PhoenixVite.Manifest.parse(%{"src/main.tsx" => entry, "js/app.js" => entry})
      :persistent_term.put({PhoenixVite.Components, @manifest}, manifest)
      on_exit(fn -> PhoenixVite.Components.clear_manifest_cache(@manifest) end)
    end
  end
end
