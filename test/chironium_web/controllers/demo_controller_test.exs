defmodule ChironiumWeb.DemoControllerTest do
  # Demo mode is global application env, and its policy affects every organization create.
  use ChironiumWeb.ConnCase, async: false

  import Chironium.Generator
  import ExUnit.CaptureLog

  alias Chironium.Accounts.Organization
  alias Chironium.Repo

  # Seeding logs a warning for each skipped BMI and waist/hip ratio.
  @moduletag :capture_log

  setup do
    stub_vite_manifest()
    put_env(:demo_mode?, true)
    :ok
  end

  describe "POST /demo" do
    test "starts a seeded demo and signs the visitor in", %{conn: conn} do
      users_before = count("SELECT count(*) FROM users")

      conn = post(conn, ~p"/demo")

      assert redirected_to(conn) == ~p"/app"
      assert count("SELECT count(*) FROM users") == users_before + 1

      [user] = demo_users()
      assert user.name == "Demo user"
      assert [_, token] = Regex.run(~r/^demo-(.+)@demo\.invalid$/, to_string(user.email))
      assert token =~ ~r/^[a-z2-7]{16}$/

      assert [org] = Ash.read!(Organization, actor: user)
      assert org.name == "Demo Clinic"
      assert org.owner_id == user.id
      assert to_string(org.slug) == "demo-" <> token

      assert Ash.count!(Chironium.Health.Patient, tenant: "org_#{org.id}", authorize?: false) ==
               15

      assert conn |> recycle() |> get(~p"/app") |> html_response(200)
    end

    # The seed code lives under Mix.Tasks, but Mix isn't in a release, so a Mix
    # shell call on this path would pass here and crash every start in production.
    test "seeds without Mix's shell" do
      previous = Mix.shell()
      Mix.shell(__MODULE__.RefusingShell)
      on_exit(fn -> Mix.shell(previous) end)

      assert {:ok, _user} = Chironium.Demo.start()
    end

    test "returns 404 when demo mode is off", %{conn: conn} do
      put_env(:demo_mode?, false)

      assert conn |> post(~p"/demo") |> response(404)
      assert demo_users() == []
    end

    test "sends a signed-in demo user back to their demo", %{conn: conn} do
      put_config(seed: fn _tenant, _opts -> :ok end)
      conn = conn |> post(~p"/demo") |> recycle()
      users = count("SELECT count(*) FROM users")
      orgs = count("SELECT count(*) FROM organizations")

      assert conn |> post(~p"/demo") |> redirected_to() == ~p"/app"
      assert count("SELECT count(*) FROM users") == users
      assert count("SELECT count(*) FROM organizations") == orgs
    end

    test "gives a visitor who signed out the same demo", %{conn: conn} do
      put_config(seed: fn _tenant, _opts -> :ok end)
      started = post(conn, ~p"/demo")
      signed_out = started |> recycle() |> delete(~p"/sign-out") |> recycle()
      users = count("SELECT count(*) FROM users")

      returned = post(signed_out, ~p"/demo")

      assert redirected_to(returned) == ~p"/app"
      assert user_id(returned) == user_id(started)
      assert count("SELECT count(*) FROM users") == users
    end

    test "refuses a start when the demo is full", %{conn: conn} do
      put_config(max_demos: 2)
      demo_user!()
      demo_user!()
      orgs = count("SELECT count(*) FROM organizations")

      conn = post(conn, ~p"/demo")

      assert redirected_to(conn) == ~p"/sign-in"

      assert Phoenix.Flash.get(conn.assigns.flash, :error) ==
               "The demo is full right now. Please try again later."

      assert length(demo_users()) == 2
      assert count("SELECT count(*) FROM organizations") == orgs
    end

    test "deletes everything it created when seeding fails", %{conn: conn} do
      put_config(seed: fn _tenant, _opts -> raise "Seeding failed on purpose." end)
      users = count("SELECT count(*) FROM users")
      orgs = count("SELECT count(*) FROM organizations")
      schemas = count_schemas()

      log =
        capture_log(fn ->
          conn = post(conn, ~p"/demo")

          assert redirected_to(conn) == ~p"/sign-in"

          assert Phoenix.Flash.get(conn.assigns.flash, :error) ==
                   "Couldn't start the demo. Please try again."
        end)

      assert log =~ "[Demo] Start failed:"
      assert log =~ "Seeding failed on purpose."
      assert count("SELECT count(*) FROM users") == users
      assert count("SELECT count(*) FROM organizations") == orgs
      assert count_schemas() == schemas
    end
  end

  describe "creating organizations" do
    @create_org """
    mutation {
      createOrganization(input: {name: "Second Clinic", slug: "second-clinic", timezone: "Etc/UTC"}) {
        result { id }
        errors { code }
      }
    }
    """

    test "is forbidden in demo mode", %{conn: conn} do
      schemas = count_schemas()

      body = conn |> sign_in(demo_user!()) |> gql(@create_org) |> json_response(200)

      assert %{"data" => %{"createOrganization" => %{"result" => nil, "errors" => errors}}} = body
      assert Enum.any?(errors, &(&1["code"] == "forbidden"))
      assert count_schemas() == schemas
    end

    test "works when demo mode is off", %{conn: conn} do
      put_env(:demo_mode?, false)

      body = conn |> sign_in(generate(user())) |> gql(@create_org) |> json_response(200)

      assert %{"data" => %{"createOrganization" => %{"result" => %{"id" => _}}}} = body
    end
  end

  test "a visitor can't reach another demo" do
    started_a = post(build_conn(), ~p"/demo")
    post(build_conn(), ~p"/demo")
    conn_a = recycle(started_a)

    [user_a] = Enum.filter(demo_users(), &(&1.id == user_id(started_a)))
    [user_b] = Enum.reject(demo_users(), &(&1.id == user_a.id))
    [org_a] = Ash.read!(Organization, actor: user_a)
    [org_b] = Ash.read!(Organization, actor: user_b)
    tenant_b = "org_#{org_b.id}"

    assert %{"data" => %{"listOrganizations" => %{"results" => [%{"id" => id}]}}} =
             conn_a |> gql("{ listOrganizations { results { id } } }") |> json_response(200)

    assert id == org_a.id

    assert %{"data" => %{"getOrganization" => nil}} =
             conn_a
             |> recycle()
             |> gql(~s|{ getOrganization(id: "#{org_b.id}") { id } }|)
             |> json_response(200)

    patients = conn_a |> recycle() |> gql("{ listPatients { results { id } } }", tenant_b)

    b_patients =
      Ash.read!(Chironium.Health.Patient, tenant: tenant_b, page: [limit: 100], authorize?: false)

    assert patients.status == 403
    assert b_patients.results != []
    refute Enum.any?(b_patients.results, &(patients.resp_body =~ &1.id))
  end

  defp put_env(key, value) do
    previous = Application.fetch_env(:chironium, key)
    Application.put_env(:chironium, key, value)

    on_exit(fn ->
      case previous do
        {:ok, value} -> Application.put_env(:chironium, key, value)
        :error -> Application.delete_env(:chironium, key)
      end
    end)
  end

  defp put_config(opts) do
    put_env(
      Chironium.Demo,
      Keyword.merge(Application.get_env(:chironium, Chironium.Demo, []), opts)
    )
  end

  defp demo_user! do
    token = :crypto.strong_rand_bytes(10) |> Base.encode32(case: :lower, padding: false)
    Ash.Seed.seed!(%Chironium.Accounts.User{email: "demo-#{token}@demo.invalid"})
  end

  defp demo_users do
    Chironium.Accounts.User
    |> Ash.read!(authorize?: false)
    |> Enum.filter(&Chironium.Demo.demo_user?/1)
  end

  defp user_id(conn) do
    {:ok, %{"sub" => "user?id=" <> id}} =
      conn |> get_session("user_token") |> AshAuthentication.Jwt.peek()

    id
  end

  defp sign_in(conn, user) do
    {:ok, token, _claims} = AshAuthentication.Jwt.token_for_user(user)
    conn |> Plug.Test.init_test_session(%{}) |> put_session("user_token", token)
  end

  defp gql(conn, query, tenant \\ nil) do
    conn = put_req_header(conn, "content-type", "application/json")
    conn = if tenant, do: put_req_header(conn, "x-chironium-organizationid", tenant), else: conn
    post(conn, "/gql", Jason.encode!(%{"query" => query}))
  end

  defp count(sql), do: Repo.query!(sql).rows |> hd() |> hd()

  defp count_schemas do
    count("SELECT count(*) FROM information_schema.schemata WHERE schema_name LIKE 'org\\_%'")
  end

  defmodule RefusingShell do
    @moduledoc false
    # Defines no functions, so any Mix shell call raises UndefinedFunctionError.
  end
end
