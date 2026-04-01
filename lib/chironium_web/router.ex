defmodule ChironiumWeb.Router do
  use ChironiumWeb, :router

  import Oban.Web.Router
  use AshAuthentication.Phoenix.Router

  import AshAuthentication.Plug.Helpers

  pipeline :graphql do
    plug :fetch_session
    plug :protect_from_forgery
    plug :load_from_session
    plug :set_actor, :user
    plug ChironiumWeb.SetTenant
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
    plug :set_actor, :user
    plug ChironiumWeb.SetTenant
  end

  scope "/gql" do
    pipe_through [:graphql]

    forward "/", Absinthe.Plug, schema: ChironiumWeb.GraphqlSchema
  end

  pipeline :require_authenticated_user do
    plug ChironiumWeb.Plugs.RequireAuthenticatedUser
  end

  scope "/", ChironiumWeb do
    pipe_through :browser

    ash_authentication_live_session :authenticated_routes do
      # in each liveview, add one of the following at the top of the module:
      #
      # If an authenticated user must be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_user_required}
      #
      # If an authenticated user *may* be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_user_optional}
      #
      # If an authenticated user must *not* be present:
      # on_mount {ChironiumWeb.LiveUserAuth, :live_no_user}
    end
  end

  # Public routes - no authentication required.
  scope "/", ChironiumWeb do
    pipe_through :browser

    auth_routes AuthController, Chironium.Accounts.User, path: "/auth"
    sign_out_route AuthController

    # Custom sign-in LiveView with branded design.
    # Uses ash_authentication_live_session to load user from session,
    # then :live_no_user redirects authenticated users to /.
    ash_authentication_live_session :auth,
      on_mount: [{ChironiumWeb.LiveUserAuth, :live_no_user}],
      layout: false do
      live "/sign-in", SignInLive
    end

    # Remove this if you do not want to use the reset password feature.
    reset_route auth_routes_prefix: "/auth",
                overrides: [ChironiumWeb.AuthOverrides]
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development.
  # These routes MUST come before the catch-all app routes.
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

  # PWA routes - requires authenticated user.
  # Phoenix is the sole auth gatekeeper: if a user reaches these routes,
  # they are authenticated. The PWA doesn't manage auth state.
  # IMPORTANT: This catch-all MUST be defined last, after all specific routes.
  scope "/", ChironiumWeb do
    pipe_through [:browser, :require_authenticated_user]

    get "/", PageController, :app
    get "/*path", PageController, :app
  end
end
