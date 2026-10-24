defmodule ChironiumWeb.Emails.SignInLinkEmail do
  @moduledoc """
  Email with a one-time sign-in link, sent when a user signs in with their email address.
  """

  use Phoenix.Component
  use Gettext, backend: ChironiumWeb.Gettext

  import ChironiumWeb.Emails.Components

  attr :url, :string, required: true

  def render(assigns) do
    ~H"""
    <.email_layout>
      <h1 class="email-heading">
        {dgettext("emails", "Sign in to Chironium")}
      </h1>
      <p class="email-text">
        {dgettext(
          "emails",
          "Use this button to sign in. The link works once and expires in 10 minutes."
        )}
      </p>
      <.email_button href={@url}>
        {dgettext("emails", "Sign in")}
      </.email_button>

      <hr class="email-divider" />
      <p class="email-muted">
        {dgettext("emails", "If you didn't try to sign in, you can safely ignore this email.")}
      </p>
    </.email_layout>
    """
  end
end
