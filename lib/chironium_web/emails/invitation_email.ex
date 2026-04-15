defmodule ChironiumWeb.Emails.InvitationEmail do
  @moduledoc """
  Email sent when a user is invited to join an organization.
  """

  use Phoenix.Component
  use Gettext, backend: ChironiumWeb.Gettext

  import ChironiumWeb.Emails.Components

  attr :invited_by_name, :string, required: true
  attr :organization_name, :string, required: true
  attr :accept_url, :string, required: true

  def render(assigns) do
    ~H"""
    <.email_layout>
      <h1 class="email-heading">
        {dgettext("emails", "You've been invited")}
      </h1>
      <p class="email-text">
        {dgettext("emails", "%{name} invited you to join %{organization}.",
          name: @invited_by_name,
          organization: @organization_name
        )}
      </p>
      <.email_button href={@accept_url}>
        {dgettext("emails", "Accept invitation")}
      </.email_button>
      <hr class="email-divider" />
      <p class="email-muted">
        {dgettext(
          "emails",
          "If you weren't expecting this invitation, you can safely ignore this email."
        )}
      </p>
    </.email_layout>
    """
  end
end
