defmodule ChironiumWeb.PageControllerTest do
  # The email and demo flags are global application env.
  use ChironiumWeb.ConnCase, async: false

  import Chironium.Generator

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

  test "tells the SPA about demo mode only when it is on", %{conn: conn} do
    refute conn |> get(~p"/app") |> html_response(200) =~ "chironium:demo"

    Chironium.DataCase.enable_demo_mode()

    assert conn |> get(~p"/app") |> html_response(200) =~
             ~s(<meta name="chironium:demo" content="true")
  end
end
