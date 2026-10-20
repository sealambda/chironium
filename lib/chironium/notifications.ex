defmodule Chironium.Notifications do
  @moduledoc """
  Public API for dispatching notifications.

  Decouples business events from delivery channels. Today everything
  goes to email; later this module will check user preferences and
  fan out to SMS, WhatsApp, push, etc.
  """

  require Logger

  alias Chironium.Notifications.Channels.Email

  @doc """
  Whether email is on. It needs `RESEND_API_KEY`; without it, invitations and
  questionnaires are shared as links only.
  """
  @spec email_enabled?() :: boolean()
  def email_enabled? do
    :chironium
    |> Application.get_env(__MODULE__, [])
    |> Keyword.get(:email_enabled?, false)
  end

  @doc """
  Dispatch a notification for the given event. Does nothing when email is off.

  ## Examples

      Notifications.send(:invitation_created, %{
        email: "alice@example.com",
        invited_by_name: "Bob",
        organization_name: "Acme",
        accept_url: "https://chironium.appfor.it/?invite_code=abc"
      })

  """
  @spec send(atom(), map()) :: :ok
  def send(event, params) when is_atom(event) and is_map(params) do
    if email_enabled?() do
      # For now, every event goes to email. Future: look up user
      # channel preferences and fan out accordingly.
      Email.deliver(event, params)
    else
      Logger.debug("[Notifications] Email is off; skipped: #{event}")
      :ok
    end
  end
end
