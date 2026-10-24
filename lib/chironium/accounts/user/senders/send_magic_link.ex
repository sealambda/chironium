defmodule Chironium.Accounts.User.Senders.SendMagicLink do
  @moduledoc """
  Emails a sign-in link. The link opens a confirm page rather than signing in
  directly, so email scanners that fetch it can't use up the single-use token.

  Sends in the request process, in the locale of the sign-in page, so the token
  is never stored in a job.
  """

  use AshAuthentication.Sender
  use ChironiumWeb, :verified_routes
  use Gettext, backend: ChironiumWeb.Gettext

  require Logger

  alias Chironium.Mailer
  alias Chironium.Mailer.Renderer
  alias ChironiumWeb.Emails.SignInLinkEmail

  @impl true
  def send(user_or_email, token, _opts) do
    if Chironium.Notifications.email_enabled?() do
      deliver(to_string(email(user_or_email)), url(~p"/sign-in/link?#{[token: token]}"))
    else
      Logger.warning("[Auth] Email is off; skipped a sign-in link.")
    end

    :ok
  end

  defp email(%{email: email}), do: email
  defp email(email), do: email

  defp deliver(email, url) do
    %{html: html, text: text} =
      Renderer.render(&SignInLinkEmail.render/1, %{url: url})

    Swoosh.Email.new()
    |> Swoosh.Email.to(email)
    |> Swoosh.Email.from(Mailer.from())
    |> Swoosh.Email.subject(dgettext("emails", "Your Chironium sign-in link"))
    |> Swoosh.Email.html_body(html)
    |> Swoosh.Email.text_body(text)
    |> Mailer.deliver()
    |> case do
      {:ok, _} -> :ok
      {:error, reason} -> Logger.error("[Auth] Sign-in link email failed: #{inspect(reason)}")
    end
  end
end
