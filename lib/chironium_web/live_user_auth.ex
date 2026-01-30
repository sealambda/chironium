defmodule ChironiumWeb.LiveUserAuth do
  @moduledoc """
  Helpers for authenticating users in LiveViews.

  The authenticated actor is a `User` resource from the Auth domain.
  To access personal data, load the `person` relationship: `user.person`.
  """

  import Phoenix.Component
  use ChironiumWeb, :verified_routes

  alias AshAuthentication.Phoenix.LiveSession

  # This is used for nested liveviews to fetch the current user.
  # To use, place the following at the top of that liveview:
  # on_mount {ChironiumWeb.LiveUserAuth, :current_user}
  @spec on_mount(atom(), map(), map() | nil, Phoenix.LiveView.Socket.t()) ::
          {:cont | :halt, Phoenix.LiveView.Socket.t()}
  def on_mount(:current_user, _params, session, socket) do
    {:cont, LiveSession.assign_new_resources(socket, session)}
  end

  # Backwards compatibility alias.
  def on_mount(:current_credential, params, session, socket) do
    on_mount(:current_user, params, session, socket)
  end

  def on_mount(:live_user_optional, _params, _session, socket) do
    if socket.assigns[:current_user] do
      {:cont, socket}
    else
      {:cont, assign(socket, :current_user, nil)}
    end
  end

  def on_mount(:live_user_required, _params, _session, socket) do
    if socket.assigns[:current_user] do
      {:cont, socket}
    else
      {:halt, Phoenix.LiveView.redirect(socket, to: ~p"/sign-in")}
    end
  end

  def on_mount(:live_no_user, _params, _session, socket) do
    if socket.assigns[:current_user] do
      {:halt, Phoenix.LiveView.redirect(socket, to: ~p"/app")}
    else
      {:cont, assign(socket, :current_user, nil)}
    end
  end
end
