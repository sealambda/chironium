defmodule Chironium.Notifications do
  @moduledoc """
  Public API for dispatching notifications.

  Decouples business events from delivery channels. Today everything
  goes to email; later this module will check user preferences and
  fan out to SMS, WhatsApp, push, etc.
  """

  alias Chironium.Notifications.Channels.Email

  @doc """
  Dispatch a notification for the given event.

  ## Examples

      Notifications.send(:invitation_created, %{
        email: "alice@example.com",
        invited_by_name: "Bob",
        organization_name: "Acme",
        accept_url: "https://chironium.appfor.it/invitations/abc"
      })

  """
  @spec send(atom(), map()) :: :ok
  def send(event, params) when is_atom(event) and is_map(params) do
    # For now, every event goes to email. Future: look up user
    # channel preferences and fan out accordingly.
    Email.deliver(event, params)
  end
end
