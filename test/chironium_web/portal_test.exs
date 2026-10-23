defmodule ChironiumWeb.PortalTest do
  use ChironiumWeb.ConnCase, async: false

  import Chironium.QuestionnaireRequestFixtures
  import ExUnit.CaptureLog

  @manifest ChironiumWeb.PortalDocuments.manifest_path()
            |> File.read!()
            |> Jason.decode!()

  setup do
    ctx = organization_context()
    patient = patient(ctx)
    practitioner = practitioner_actor(ctx, patient)
    task = request!(ctx, practitioner, patient, questionnaire(ctx))

    Map.merge(ctx, %{
      patient: patient,
      practitioner: practitioner,
      task: task,
      token: token_from_url(task.__metadata__.link_url)
    })
  end

  describe "confirm page" do
    test "shows a continue form without consuming the link", %{conn: conn} = ctx do
      conn = get(conn, ~p"/portal/sign-in?#{[token: ctx.token]}")

      html = html_response(conn, 200)
      assert html =~ ~s(action="/auth/guest/magic_link")
      assert html =~ Plug.HTML.html_escape(ctx.organization.name)
      assert get_resp_header(conn, "referrer-policy") == ["no-referrer"]
      assert html =~ ~s(<meta name="referrer" content="no-referrer")

      refute reload(access(ctx.task, :link)).claimed_at
      assert {:ok, _} = sign_in(ctx.token)
    end

    test "speaks the organization's language", %{conn: conn} = ctx do
      ctx.organization
      |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"}, authorize?: false)
      |> Ash.update!()

      html = conn |> get(~p"/portal/sign-in?#{[token: ctx.token]}") |> html_response(200)

      assert html =~ ~s(<html lang="es")
      assert html =~ "Tu cuestionario"
      assert html =~ "Continuar"
    end

    test "sends an invalid or used link to the expired page", %{conn: conn} do
      assert conn |> get(~p"/portal/sign-in?#{[token: "nope"]}") |> redirected_to() ==
               ~p"/portal/link-expired"

      assert conn |> get(~p"/portal/sign-in") |> redirected_to() == ~p"/portal/link-expired"
    end
  end

  describe "sign-in" do
    test "claims the link and starts a session without a token in the URL", %{conn: conn} = ctx do
      conn = post(conn, "/auth/guest/magic_link", %{"token" => ctx.token})

      assert redirected_to(conn) == ~p"/portal"
      assert get_session(conn, "guest_token")
      assert reload(access(ctx.task, :link)).claimed_at
      assert reload(access(ctx.task, :email)).revoked_at
      assert reload(ctx, ctx.task).status == :in_progress
    end

    test "a used link fails, but its session carries on", %{conn: conn} = ctx do
      conn = post(conn, "/auth/guest/magic_link", %{"token" => ctx.token})

      assert build_conn()
             |> post("/auth/guest/magic_link", %{"token" => ctx.token})
             |> redirected_to() ==
               ~p"/portal/link-expired"

      # Reopening the link in the signed-in browser continues the session.
      assert conn
             |> recycle()
             |> get(~p"/portal/sign-in?#{[token: ctx.token]}")
             |> redirected_to() ==
               ~p"/portal"
    end

    test "the email link dies once the copied link is used", %{conn: conn} = ctx do
      {:ok, email_url} = Chironium.Accounts.GuestAccess.sign_in_url(access(ctx.task, :email))
      post(conn, "/auth/guest/magic_link", %{"token" => ctx.token})

      assert build_conn()
             |> post("/auth/guest/magic_link", %{"token" => token_from_url(email_url)})
             |> redirected_to() == ~p"/portal/link-expired"
    end

    test "the strategy's link request endpoint is closed", %{conn: conn} = ctx do
      conn =
        post(conn, "/auth/guest/magic_link/request", %{
          "guest" => %{"id" => access(ctx.task, :link).id}
        })

      assert redirected_to(conn) == ~p"/portal/link-expired"
    end

    test "the request page needs a session", %{conn: conn} do
      assert conn |> get(~p"/portal") |> redirected_to() == ~p"/portal/link-expired"
    end
  end

  describe "portal API" do
    test "returns the patient's request and accepts their answers", %{conn: conn} = ctx do
      conn = signed_in(conn, ctx)

      %{"data" => %{"listTasks" => %{"results" => [task]}}} =
        conn |> portal_gql("PortalRequest") |> json_response(200)

      assert task["id"] == ctx.task.id
      assert task["requesterName"] == "Dr. Rivera"
      assert task["focusQuestionnaire"]["title"] == "Weekly check-in"
      assert task["organizationTimezone"] == "Etc/UTC"
      refute Map.has_key?(task, "note")

      %{"data" => %{"submitQuestionnaireResponseFromPortal" => result}} =
        conn
        |> recycle()
        |> portal_gql("PortalSubmitResponse", %{
          "input" => %{"taskId" => ctx.task.id, "item" => graphql_answers()}
        })
        |> json_response(200)

      assert result["errors"] == []
      assert reload(ctx, ctx.task).status == :completed

      # Submitting ended the session.
      assert conn |> recycle() |> portal_gql("PortalRequest") |> json_response(401)
    end

    test "ignores a spoofed tenant header", %{conn: conn} = ctx do
      other = organization_context()

      %{"data" => %{"listTasks" => %{"results" => [task]}}} =
        conn
        |> signed_in(ctx)
        |> put_req_header("x-chironium-organizationid", other.tenant)
        |> portal_gql("PortalRequest")
        |> json_response(200)

      assert task["id"] == ctx.task.id
    end

    test "rejects requests without a guest session", %{conn: conn} do
      assert conn |> portal_gql("PortalRequest") |> json_response(401)
    end

    test "rejects documents that are not persisted", %{conn: conn} = ctx do
      response =
        conn
        |> signed_in(ctx)
        |> put_req_header("content-type", "application/json")
        |> post("/portal/gql", Jason.encode!(%{"query" => "{ listPatients { results { id } } }"}))
        |> json_response(400)

      assert [%{"message" => "Only persisted documents are accepted."}] = response["errors"]
    end

    test "only accepts POST", %{conn: conn} = ctx do
      # A GET never reaches Absinthe; it falls through to the staff app's sign-in.
      conn = conn |> signed_in(ctx) |> get("/portal/gql", %{"id" => document_id("PortalRequest")})

      assert redirected_to(conn) == ~p"/sign-in"
    end

    test "checks the CSRF token", %{conn: conn} = ctx do
      conn = conn |> signed_in(ctx) |> put_private(:plug_skip_csrf_protection, false)

      assert_raise Plug.CSRFProtection.InvalidCSRFTokenError, fn ->
        portal_gql(conn, "PortalRequest")
      end
    end
  end

  describe "sessions" do
    test "the staff API ignores guest sessions", %{conn: conn} = ctx do
      conn = signed_in(conn, ctx)

      # With a tenant header, SetTenant finds no staff user.
      assert conn |> staff_gql("{ listTasks { results { id } } }", ctx.tenant) |> response(403)

      # Without one, there is no actor at all.
      assert %{"errors" => [%{"message" => "Not authenticated"}]} =
               conn |> recycle() |> staff_gql("{ currentActor { id } }") |> json_response(200)
    end

    test "signing out ends only the guest session", %{conn: conn} = ctx do
      {:ok, user_token, _claims} = AshAuthentication.Jwt.token_for_user(ctx.owner)

      conn =
        conn
        |> signed_in(ctx)
        |> recycle()
        |> Plug.Test.init_test_session(%{})
        |> put_session("user_token", user_token)
        |> post(~p"/portal/sign-out")

      assert redirected_to(conn) == ~p"/portal/signed-out"
      refute get_session(conn, "guest_token")
      assert get_session(conn, "user_token") == user_token
      assert conn |> recycle() |> portal_gql("PortalRequest") |> json_response(401)
    end

    test "sessions stop working when the access expires", %{conn: conn} = ctx do
      conn = signed_in(conn, ctx)
      expire!(access(ctx.task, :link))

      assert conn |> portal_gql("PortalRequest") |> json_response(401)
    end

    test "sessions stop working when the request is cancelled", %{conn: conn} = ctx do
      conn = signed_in(conn, ctx)

      ctx.task
      |> Ash.Changeset.for_update(:cancel, %{}, actor: ctx.practitioner, tenant: ctx.tenant)
      |> Ash.update!()

      assert conn |> portal_gql("PortalRequest") |> json_response(401)
    end
  end

  describe "hardening" do
    test "rate-limits sign-in attempts per client", %{conn: conn} do
      previous = Application.get_env(:chironium, ChironiumWeb.Plugs.PortalRateLimit)
      Application.put_env(:chironium, ChironiumWeb.Plugs.PortalRateLimit, sign_in_limit: 2)

      on_exit(fn ->
        Application.put_env(:chironium, ChironiumWeb.Plugs.PortalRateLimit, previous)
      end)

      ip = "203.0.113.#{System.unique_integer([:positive]) |> rem(250)}"

      attempt = fn ->
        conn |> put_req_header("x-forwarded-for", ip) |> get(~p"/portal/sign-in")
      end

      assert attempt.().status == 302
      assert attempt.().status == 302
      assert attempt.().status == 429

      # Entries left of the proxy's own are client-supplied and can't open a new bucket.
      spoofed =
        conn
        |> put_req_header("x-forwarded-for", "198.51.100.7, #{ip}")
        |> get(~p"/portal/sign-in")

      assert spoofed.status == 429
    end

    test "the token never reaches the logs or PostHog", %{conn: conn} = ctx do
      level = Logger.level()
      Logger.configure(level: :debug)
      on_exit(fn -> Logger.configure(level: level) end)

      log =
        capture_log([level: :debug], fn ->
          conn = get(conn, ~p"/portal/sign-in?#{[token: ctx.token]}")
          refute inspect(PostHog.Context.get(:all, :all)) =~ ctx.token

          conn = conn |> recycle() |> post("/auth/guest/magic_link", %{"token" => ctx.token})

          conn
          |> recycle()
          |> portal_gql("PortalSubmitResponse", %{
            "input" => %{"taskId" => ctx.task.id, "item" => graphql_answers()}
          })
        end)

      assert log =~ "/portal/sign-in"
      refute log =~ ctx.token
    end
  end

  defp signed_in(conn, ctx) do
    conn
    |> post("/auth/guest/magic_link", %{"token" => ctx.token})
    |> recycle()
  end

  defp portal_gql(conn, operation, variables \\ %{}) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(
      "/portal/gql",
      Jason.encode!(%{"id" => document_id(operation), "variables" => variables})
    )
  end

  defp staff_gql(conn, query, tenant \\ nil) do
    conn = put_req_header(conn, "content-type", "application/json")
    conn = if tenant, do: put_req_header(conn, "x-chironium-organizationid", tenant), else: conn
    post(conn, "/gql", Jason.encode!(%{"query" => query}))
  end

  defp document_id(operation) do
    Enum.find_value(@manifest, fn {id, document} ->
      if document =~ ~r/(query|mutation) #{operation}\b/, do: id
    end) || flunk("No persisted document named #{operation}.")
  end

  defp graphql_answers do
    [
      %{
        "linkId" => "weight",
        "answer" => [%{"valueQuantity" => %{"value" => 71.0, "unit" => "kg", "code" => "kg"}}]
      }
    ]
  end

  test "every persisted document hashes to its ID" do
    for {id, document} <- @manifest do
      assert id == "sha256:" <> Base.encode16(:crypto.hash(:sha256, document), case: :lower)
    end
  end
end
