defmodule ChironiumWeb.SignInTest do
  # Changes the global sign-in provider config.
  use ChironiumWeb.ConnCase, async: false

  import Phoenix.LiveViewTest
  import Swoosh.TestAssertions

  setup :stub_vite_manifest

  setup do
    providers = Application.get_env(:chironium, :sign_in_providers)
    on_exit(fn -> Application.put_env(:chironium, :sign_in_providers, providers) end)
  end

  defp set_providers(providers),
    do: Application.put_env(:chironium, :sign_in_providers, providers)

  describe "sign-in page" do
    test "shows only the configured providers", %{conn: conn} do
      set_providers(google: nil, oidc: nil)
      html = conn |> get(~p"/sign-in") |> html_response(200)
      refute html =~ "sign-in-google-link"
      refute html =~ "sign-in-oidc-link"
      assert html =~ "sign-in-email-form"

      set_providers(google: [client_id: "id"], oidc: [client_id: "id", display_name: "Authentik"])
      html = conn |> get(~p"/sign-in") |> html_response(200)
      assert html =~ "sign-in-google-link"
      assert html =~ "Continue with Authentik"
    end

    test "demo mode shows only the demo button", %{conn: conn} do
      set_providers(google: [client_id: "id"], oidc: [client_id: "id", display_name: "Authentik"])
      html = conn |> get(~p"/sign-in") |> html_response(200)
      refute html =~ ~s(data-testid="sign-in-demo-button")
      assert html =~ ~s(data-testid="sign-in-google-link")
      assert html =~ ~s(data-testid="sign-in-oidc-link")
      assert html =~ ~s(data-testid="sign-in-email-form")

      Chironium.DataCase.enable_demo_mode()
      html = conn |> get(~p"/sign-in") |> html_response(200)
      assert html =~ "Try Chironium"
      assert html =~ ~s(data-testid="sign-in-demo-button")
      assert html =~ ~s(action="/demo")
      assert html =~ "Your demo is deleted after 24 hours."
      refute html =~ ~s(data-testid="sign-in-google-link")
      refute html =~ ~s(data-testid="sign-in-oidc-link")
      refute html =~ ~s(data-testid="sign-in-email-form")
    end

    # Following the form starts a real demo, whose seeding logs skipped BMI warnings.
    @tag :capture_log
    test "the demo button posts the form only after the click is handled", %{conn: conn} do
      Chironium.DataCase.enable_demo_mode()
      {:ok, view, _html} = live(conn, ~p"/sign-in")

      form = form(view, "form[action='/demo']")
      assert render_submit(form) =~ ~s(phx-trigger-action)
      conn = follow_trigger_action(form, conn)
      assert conn.method == "POST"
      assert conn.request_path == ~p"/demo"
    end

    test "shows the flash of a refused demo start", %{conn: conn} do
      Chironium.DataCase.enable_demo_mode()
      previous = Application.get_env(:chironium, Chironium.Demo, [])
      Application.put_env(:chironium, Chironium.Demo, Keyword.put(previous, :max_demos, 0))
      on_exit(fn -> Application.put_env(:chironium, Chironium.Demo, previous) end)

      conn = post(conn, ~p"/demo")
      html = conn |> recycle() |> get(~p"/sign-in") |> html_response(200)
      assert html =~ "The demo is full right now. Please try again later."
    end

    test "keeps the language from the cookie once connected", %{conn: conn} do
      {:ok, view, _html} =
        conn |> put_req_cookie("PARAGLIDE_LOCALE", "es") |> live(~p"/sign-in")

      assert render(view) =~ "Cambiar idioma"
    end

    test "links to the source code from the header, in a new tab", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/sign-in")

      assert [link] =
               html
               |> LazyHTML.from_document()
               |> LazyHTML.query("header a[target=_blank]")
               |> Enum.to_list()

      assert LazyHTML.attribute(link, "href") == ["https://github.com/sealambda/chironium"]
      assert LazyHTML.attribute(link, "aria-label") == ["Source code"]
    end

    test "signing out keeps the language", %{conn: conn} do
      conn =
        conn
        |> put_req_cookie("PARAGLIDE_LOCALE", "es")
        |> Plug.Test.init_test_session(%{})
        |> delete(~p"/sign-out")

      assert Phoenix.Flash.get(conn.assigns.flash, :info) == "Has cerrado sesión."
    end

    test "a provider that is off fails back to the sign-in page", %{conn: conn} do
      set_providers(google: nil, oidc: nil)
      conn = get(conn, ~p"/auth/user/oidc")

      assert redirected_to(conn) == ~p"/sign-in"
      assert Phoenix.Flash.get(conn.assigns.flash, :error) =~ "Sign-in failed"
    end
  end

  describe "emailed link" do
    test "signs in after the confirm step, once", %{conn: conn} do
      conn =
        post(conn, ~p"/auth/user/magic_link/request", %{"user" => %{"email" => "eva@example.com"}})

      assert redirected_to(conn) == ~p"/sign-in"
      assert Phoenix.Flash.get(conn.assigns.flash, :info) =~ "Check your email"

      assert_email_sent(fn email ->
        assert email.to == [{"", "eva@example.com"}]
        [_, token] = Regex.run(~r{/sign-in/link\?token=([^"&\s]+)}, email.html_body)
        send(self(), {:token, URI.decode_www_form(token)})
      end)

      assert_received {:token, token}

      # Opening the link only shows a button, so link scanners can't use it up.
      html = build_conn() |> get(~p"/sign-in/link?#{[token: token]}") |> html_response(200)
      assert html =~ ~s(action="/auth/user/magic_link")

      conn = post(build_conn(), ~p"/auth/user/magic_link", %{"token" => token})
      assert redirected_to(conn) == "/app"
      assert get_session(conn, "user_token")

      conn = post(build_conn(), ~p"/auth/user/magic_link", %{"token" => token})
      assert redirected_to(conn) == ~p"/sign-in"
      assert Phoenix.Flash.get(conn.assigns.flash, :error) =~ "expired or was already used"
    end

    test "switching language on the confirm page keeps the link", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/sign-in/link?#{[token: "the-token"]}")

      assert {:error, {:live_redirect, %{to: to}}} =
               render_click(view, "set_locale", %{"locale" => "es"})

      %URI{path: path, query: query} = URI.parse(to)
      assert path == "/sign-in/link"
      assert %{"token" => "the-token", "locale" => "es"} = URI.decode_query(query)
    end
  end
end
