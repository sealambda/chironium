defmodule ChironiumWeb.AuthOverrides do
  @moduledoc """
  UI overrides for AshAuthentication Phoenix components.

  Customize the appearance and behavior of authentication UI elements.
  """
  use AshAuthentication.Phoenix.Overrides

  # Configure your UI overrides here.

  # First argument to `override` is the component name you are overriding.
  # The body contains any number of configurations you wish to override
  # Below are some examples

  # For a complete reference, see https://hexdocs.pm/ash_authentication_phoenix/ui-overrides.html

  # override AshAuthentication.Phoenix.Components.Banner do
  #   set :image_url, "https://media.giphy.com/media/g7GKcSzwQfugw/giphy.gif"
  #   set :text_class, "bg-red-500"
  # end

  # override AshAuthentication.Phoenix.Components.SignIn do
  #  set :show_banner, false
  # end
end
