defmodule ChironiumWeb.Router do
  use ChironiumWeb, :router

  import Oban.Web.Router
  use AshAuthentication.Phoenix.Router

  import AshAuthentication.Plug.Helpers

  pipeline :graphql do
    plug :fetch_session
    # TODO Re-enable in prod, just for testing with /gql/playground
    # plug :protect_from_forgery
    plug :load_from_session
    plug ChironiumWeb.Plugs.SetPosthogContext
    plug :set_actor, :user
    plug ChironiumWeb.SetTenant
    plug ChironiumWeb.Plugs.SetLocale
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
    plug ChironiumWeb.Plugs.SetPosthogContext
    plug ChironiumWeb.SetTenant
    plug ChironiumWeb.Plugs.SetLocale
  end

  scope "/gql" do
    pipe_through [:graphql]

    # TODO need to comment out plug :protect_from_forgery in pipeline :graphql to test it
    forward "/playground", Absinthe.Plug.GraphiQL,
      schema: ChironiumWeb.GraphqlSchema,
      socket: ChironiumWeb.GraphqlSocket,
      # we'd need :advanced to support CSRF tokens, but it's broken
      # https://github.com/absinthe-graphql/absinthe_plug/issues/303
      interface: :playground,
      default_headers: {__MODULE__, :graphiql_headers}

    forward "/", Absinthe.Plug, schema: ChironiumWeb.GraphqlSchema
  end

  # Patient portal. No PostHog, no staff tenant header, and no referrer: portal
  # URLs can carry sign-in tokens.
  pipeline :portal_browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers, %{"referrer-policy" => "no-referrer"}
    plug :load_from_session
    plug ChironiumWeb.Plugs.SetLocale
  end

  pipeline :portal_graphql do
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers, %{"referrer-policy" => "no-referrer"}
    plug :load_from_session
    plug ChironiumWeb.Plugs.SetPortalActor
    plug ChironiumWeb.Plugs.RequirePersistedDocument
    plug ChironiumWeb.Plugs.SetLocale
    plug AshGraphql.Plug
  end

  scope "/portal" do
    pipe_through [:portal_graphql]

    # Persisted documents only: this endpoint never accepts ad hoc queries.
    post "/gql", Absinthe.Plug,
      schema: ChironiumWeb.GraphqlSchema,
      document_providers: [ChironiumWeb.PortalDocuments]
  end

  scope "/portal", ChironiumWeb do
    pipe_through [:portal_browser]

    get "/sign-in", PortalController, :sign_in
    post "/sign-out", PortalController, :sign_out
    get "/", PortalController, :request
    get "/done", PortalController, :app
    get "/link-expired", PortalController, :app
    get "/signed-out", PortalController, :app
  end

  def graphiql_headers do
    %{
      "X-CSRF-Token" => Plug.CSRFProtection.get_csrf_token()
    }
  end

  pipeline :require_authenticated_user do
    plug ChironiumWeb.Plugs.RequireAuthenticatedUser
  end

  # JSON body is parsed in Endpoint; no CSRF — dev-only Playwright session bootstrap.
  pipeline :playwright_e2e do
    plug :accepts, ["json"]
    plug :fetch_session
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

    auth_routes AuthController, [Chironium.Accounts.User, Chironium.Accounts.GuestAccess],
      path: "/auth"

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
    scope "/dev/playwright", ChironiumWeb do
      pipe_through :playwright_e2e

      post "/session", PlaywrightE2EController, :create
      post "/user", PlaywrightE2EController, :ensure_user
      post "/invitation-code", PlaywrightE2EController, :invitation_code
    end
  end

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
