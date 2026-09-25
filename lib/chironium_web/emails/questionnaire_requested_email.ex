defmodule ChironiumWeb.Emails.QuestionnaireRequestedEmail do
  @moduledoc """
  Email that sends a patient a single-use link to answer a questionnaire.
  """

  use Phoenix.Component
  use Gettext, backend: ChironiumWeb.Gettext

  import ChironiumWeb.Emails.Components

  attr :requester_name, :string, default: nil
  attr :organization_name, :string, required: true
  attr :questionnaire_title, :string, default: nil
  attr :message, :string, default: nil
  attr :expires_on, :string, required: true
  attr :url, :string, required: true

  def render(assigns) do
    ~H"""
    <.email_layout>
      <h1 class="email-heading">
        {dgettext("emails", "A questionnaire for you")}
      </h1>
      <p class="email-text">
        {if @requester_name,
          do:
            dgettext("emails", "%{name} from %{organization} asked you to answer a questionnaire.",
              name: @requester_name,
              organization: @organization_name
            ),
          else:
            dgettext("emails", "%{organization} asked you to answer a questionnaire.",
              organization: @organization_name
            )}
      </p>
      <p :if={@questionnaire_title} class="email-text">
        <strong>{@questionnaire_title}</strong>
      </p>
      <p :if={@message} class="email-text">{@message}</p>
      <.email_button href={@url}>
        {dgettext("emails", "Answer the questionnaire")}
      </.email_button>

      <hr class="email-divider" />
      <p class="email-muted">
        {dgettext(
          "emails",
          "The link can be opened once, on one device, and stays valid until %{date}. Please don't forward it: anyone with the link can answer in your name.",
          date: @expires_on
        )}
      </p>
    </.email_layout>
    """
  end
end
