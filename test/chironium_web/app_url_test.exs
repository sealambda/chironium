defmodule ChironiumWeb.AppUrlTest do
  use ExUnit.Case, async: true

  alias ChironiumWeb.AppUrl

  test "joins the endpoint, the app base path, the path and the query" do
    base = ChironiumWeb.Endpoint.url()

    assert AppUrl.url() == "#{base}/app"
    assert AppUrl.url("/customers/123") == "#{base}/app/customers/123"
    assert AppUrl.url("", inviteCode: "ABC") == "#{base}/app?inviteCode=ABC"
  end
end
