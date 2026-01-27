defmodule ChironiumWeb.Router do
  use ChironiumWeb, :router

  import Oban.Web.Router
  use AshAuthentication.Phoenix.Router

  import AshAuthentication.Plug.Helpers

  pipeline :graphql do
    plug :fetch_session
    plug :protect_from_forgery
    plug :load_from_session
    plug :load_from_bearer
    plug :set_actor, :user
    plug AshGraphql.Plug
  end

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ChironiumWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :load_from_session
    # Capture and validate referrer origin for secure PWA auth redirects.
    plug ChironiumWeb.Plugs.AuthReturnState
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :load_from_bearer
    plug :set_actor, :user
  end

  scope "/", ChironiumWeb do
    pipe_through :browser

    ash_authentication_live_session :authenticated_routes do
      # In each liveview, add one of the following at the top of the module:
      #
      # If an authenticated credential must be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_user_required}
      #
      # If an authenticated credential *may* be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_user_optional}
      #
      # If an authenticated credential must *not* be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_no_user}
    end
  end

  scope "/gql" do
    pipe_through [:graphql]

    forward "/playground", Absinthe.Plug.GraphiQL,
      schema: ChironiumWeb.Api.Graphql.Schema,
      socket: ChironiumWeb.Api.Graphql.Socket,
      interface: :simple

    forward "/", Absinthe.Plug, schema: ChironiumWeb.Api.Graphql.Schema
  end

  scope "/", ChironiumWeb do
    pipe_through :browser

    get "/", PageController, :home

    get "/index.html", PageController, :app
    get "/app/*path", PageController, :app

    auth_routes AuthController, Chironium.Core.Identity.User, path: "/auth"
    sign_out_route AuthController

    # Custom sign-in LiveView with branded design.
    live_session :auth,
      on_mount: [{ChironiumWeb.LiveUserAuth, :live_no_user}],
      layout: false do
      live "/sign-in", SignInLive
    end

    # Remove this if you do not want to use the reset password feature.
    reset_route auth_routes_prefix: "/auth",
                overrides: [ChironiumWeb.AuthOverrides]
  end

  # Other scopes may use custom stacks.
  # scope "/api", ChironiumWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development.
  if Application.compile_env(:chironium, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: ChironiumWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end

    scope "/" do
      pipe_through :browser

      oban_dashboard("/oban")
    end
  end

  if Application.compile_env(:chironium, :dev_routes) do
    import AshAdmin.Router

    scope "/admin" do
      pipe_through :browser

      ash_admin "/"
    end
  end
end
