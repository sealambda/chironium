defmodule ChironiumWeb.GraphqlCsrfTest do
  use ChironiumWeb.ConnCase, async: true

  @body ~s({"query": "{ __typename }"})

  # Phoenix.ConnTest skips CSRF checks by default; re-enable them to exercise the real pipeline.
  defp post_graphql(conn) do
    conn
    |> put_private(:plug_skip_csrf_protection, false)
    |> put_req_header("content-type", "application/json")
    |> post("/gql", @body)
  end

  test "rejects a POST without a CSRF token", %{conn: conn} do
    assert_error_sent 403, fn ->
      conn |> init_test_session(%{}) |> post_graphql()
    end
  end

  test "accepts a POST with a valid CSRF token", %{conn: conn} do
    token = Plug.CSRFProtection.get_csrf_token()

    conn =
      conn
      |> init_test_session(%{"_csrf_token" => Plug.CSRFProtection.dump_state()})
      |> put_req_header("x-csrf-token", token)
      |> post_graphql()

    assert %{"data" => %{"__typename" => _}} = json_response(conn, 200)
  end
end
