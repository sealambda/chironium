defmodule Chironium.Accounts.SignInMethodsTest do
  use Chironium.DataCase, async: true

  alias AshAuthentication.{Info, Strategy}
  alias AshAuthentication.Strategy.MagicLink
  alias Chironium.Accounts.User

  defp provider_sign_in(provider, claims) do
    user_info =
      Map.merge(
        %{"sub" => "sub-#{System.unique_integer([:positive])}", "email_verified" => true},
        claims
      )

    User
    |> Info.strategy!(provider)
    |> Strategy.action(:register, %{"user_info" => user_info, "oauth_tokens" => %{}})
  end

  defp email_link_sign_in(email) do
    strategy = Info.strategy!(User, :magic_link)

    {:ok, token} =
      MagicLink.request_token_for_identity(strategy, email)

    Strategy.action(strategy, :sign_in, %{"token" => token})
  end

  test "every method signs in to the same account for the same email" do
    {:ok, by_link} = email_link_sign_in("ana@example.com")
    {:ok, by_google} = provider_sign_in(:google, %{"email" => "ana@example.com", "name" => "Ana"})
    {:ok, by_oidc} = provider_sign_in(:oidc, %{"email" => "ANA@example.com"})

    assert by_google.id == by_link.id
    assert by_oidc.id == by_link.id
    assert Ash.get!(User, by_link.id, authorize?: false).name == "Ana"
  end

  test "an emailed link signs in an account created through a provider" do
    {:ok, by_oidc} = provider_sign_in(:oidc, %{"email" => "ben@example.com"})
    {:ok, by_link} = email_link_sign_in("ben@example.com")

    assert by_link.id == by_oidc.id
  end

  test "a provider that has not verified the email can't sign in or create an account" do
    {:ok, existing} = email_link_sign_in("cleo@example.com")

    for provider <- [:google, :oidc], verified <- [false, "false", nil] do
      assert {:error, _} =
               provider_sign_in(provider, %{
                 "email" => "cleo@example.com",
                 "email_verified" => verified
               })

      assert {:error, _} =
               provider_sign_in(provider, %{
                 "email" => "new@example.com",
                 "email_verified" => verified
               })
    end

    assert [%{id: id}] = Ash.read!(User, authorize?: false)
    assert id == existing.id
  end

  test "accepts a verified claim sent as a string" do
    assert {:ok, _} =
             provider_sign_in(:oidc, %{"email" => "dan@example.com", "email_verified" => "true"})
  end
end
