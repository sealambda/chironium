defmodule ChironiumWeb.Plugs.PostHogContextTest do
  use ExUnit.Case, async: true

  import Plug.Test

  alias ChironiumWeb.Plugs.PostHogContext

  @opts PostHogContext.init([])

  test "masks invite codes in the recorded URL and leaves the request untouched" do
    conn = conn(:get, "/app?inviteCode=ABCDEFGH&tab=members")

    assert PostHogContext.call(conn, @opts).query_string == "inviteCode=ABCDEFGH&tab=members"

    url = PostHog.Context.get(:all)[:"$current_url"]
    refute url =~ "ABCDEFGH"
    assert url =~ "inviteCode=<MASKED>&tab=members"
  end

  test "masks an invite code inside a URL-encoded return URL" do
    PostHogContext.call(
      conn(:get, "/sign-in?return_to=%2Fapp%3FinviteCode%3DABCDEFGH%26x%3D1"),
      @opts
    )

    url = PostHog.Context.get(:all)[:"$current_url"]
    refute url =~ "ABCDEFGH"
    assert url =~ "inviteCode%3D<MASKED>%26x%3D1"
  end

  test "records nothing on patient-link routes" do
    PostHogContext.call(conn(:get, "/portal/sign-in?token=secret"), @opts)

    assert PostHog.Context.get(:all) == %{}
  end
end
