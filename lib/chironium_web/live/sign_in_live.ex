defmodule ChironiumWeb.SignInLive do
  @moduledoc """
  Custom sign-in LiveView with branded pink/black design.

  Features:
  - Google OAuth authentication.
  - Accessible UI with ARIA attributes.
  - Responsive mobile-first design.
  - Theme toggle (light/dark).
  - Language selector (en/es).
  """
  use ChironiumWeb, :live_view

  @supported_locales [
    {"en", "English"},
    {"es", "Español"}
  ]

  @impl true
  def mount(_params, session, socket) do
    locale = session["locale"] || Gettext.get_locale(ChironiumWeb.Gettext)
    theme = "dark"

    {:ok,
     socket
     |> assign(:page_title, gettext("Sign In"))
     |> assign(:theme, theme)
     |> assign(:locale, locale)
     |> assign(:supported_locales, @supported_locales)
     |> assign(:show_language_menu, false)}
  end

  @impl true
  def handle_event("toggle_theme", _params, socket) do
    new_theme = if socket.assigns.theme == "dark", do: "light", else: "dark"
    {:noreply, assign(socket, :theme, new_theme)}
  end

  def handle_event("toggle_language_menu", _params, socket) do
    {:noreply, assign(socket, :show_language_menu, !socket.assigns.show_language_menu)}
  end

  def handle_event("close_language_menu", _params, socket) do
    {:noreply, assign(socket, :show_language_menu, false)}
  end

  def handle_event("set_locale", %{"locale" => locale}, socket) do
    Gettext.put_locale(ChironiumWeb.Gettext, locale)
    theme = socket.assigns.theme

    {:noreply,
     socket
     |> assign(:locale, locale)
     |> assign(:show_language_menu, false)
     |> push_navigate(to: ~p"/sign-in?locale=#{locale}&theme=#{theme}")}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    locale = params["locale"] || socket.assigns.locale
    theme = params["theme"] || socket.assigns.theme

    # Validate theme.
    theme =
      if theme in ["dark", "light"] do
        theme
      else
        socket.assigns.theme
      end

    socket =
      if locale in Enum.map(@supported_locales, fn {code, _} -> code end) do
        Gettext.put_locale(ChironiumWeb.Gettext, locale)
        assign(socket, locale: locale, theme: theme)
      else
        assign(socket, :theme, theme)
      end

    {:noreply, socket}
  end

  # ============================================================================
  # Template
  # ============================================================================

  @impl true
  def render(assigns) do
    ~H"""
    <div
      class="min-h-screen bg-auth-bg text-auth-fg flex flex-col antialiased transition-colors duration-200"
      data-auth-theme={@theme}
    >
      <.auth_header
        theme={@theme}
        locale={@locale}
        supported_locales={@supported_locales}
        show_language_menu={@show_language_menu}
      />

      <main class="flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div class="w-full max-w-sm space-y-6">
          <.brand_badge />
          <.welcome_heading />
          <.oauth_buttons />
        </div>
      </main>

      <.auth_footer />
    </div>
    """
  end

  # ============================================================================
  # Function Components
  # ============================================================================

  attr :theme, :string, required: true
  attr :locale, :string, required: true
  attr :supported_locales, :list, required: true
  attr :show_language_menu, :boolean, required: true

  defp auth_header(assigns) do
    ~H"""
    <header class="flex items-center justify-between px-4 sm:px-6 py-4">
      <div class="flex items-center gap-2 text-auth-primary">
        <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
        </svg>
        <span class="font-semibold uppercase tracking-wide text-sm" style="font-variant: small-caps">
          CHIRONIUM
        </span>
      </div>
      <div class="flex items-center gap-1">
        <%!-- Language selector --%>
        <div class="relative">
          <button
            type="button"
            phx-click="toggle_language_menu"
            class="size-9 rounded-md flex items-center justify-center text-auth-muted hover:text-auth-fg hover:bg-auth-surface transition-all focus:outline-none focus-visible:ring-[3px] focus-visible:ring-auth-ring/50"
            aria-label={gettext("Change language")}
            aria-expanded={@show_language_menu}
            aria-haspopup="true"
          >
            <.icon name="hero-globe-alt" class="size-4" />
          </button>
          <div
            :if={@show_language_menu}
            class="absolute right-0 top-full mt-1 w-32 rounded-md bg-auth-card border border-auth-border shadow-lg z-50 overflow-hidden"
            role="menu"
            phx-click-away="close_language_menu"
          >
            <button
              :for={{code, name} <- @supported_locales}
              type="button"
              phx-click="set_locale"
              phx-value-locale={code}
              role="menuitem"
              class={[
                "w-full px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-auth-surface focus:bg-auth-surface focus:outline-none",
                @locale == code && "text-auth-primary font-medium",
                @locale != code && "text-auth-fg"
              ]}
            >
              {name}
            </button>
          </div>
        </div>
        <%!-- Theme toggle --%>
        <button
          type="button"
          phx-click="toggle_theme"
          class="size-9 rounded-md flex items-center justify-center text-auth-muted hover:text-auth-fg hover:bg-auth-surface transition-all focus:outline-none focus-visible:ring-[3px] focus-visible:ring-auth-ring/50"
          aria-label={
            if @theme == "dark",
              do: gettext("Switch to light mode"),
              else: gettext("Switch to dark mode")
          }
        >
          <.icon :if={@theme == "dark"} name="hero-sun" class="size-4" />
          <.icon :if={@theme == "light"} name="hero-moon" class="size-4" />
        </button>
      </div>
    </header>
    """
  end

  defp brand_badge(assigns) do
    ~H"""
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="absolute inset-0 bg-auth-glow blur-xl rounded-full opacity-50"
          aria-hidden="true"
        >
        </div>
        <div class="relative size-14 sm:size-20 rounded-auth-xl bg-linear-to-br from-auth-primary to-pink-700 flex items-center justify-center shadow-sm ring-1 ring-auth-border">
          <.icon name="hero-lock-closed-solid" class="size-7 sm:size-10 text-auth-primary-fg" />
        </div>
      </div>
    </div>
    """
  end

  defp welcome_heading(assigns) do
    ~H"""
    <div class="text-center space-y-1">
      <h1 class="text-lg sm:text-xl font-medium tracking-tight" data-testid="sign-in-heading">
        {gettext("Welcome Back")}
      </h1>
      <p class="text-auth-muted text-sm">
        {gettext("Sign in with your Google account to continue.")}
      </p>
    </div>
    """
  end

  defp oauth_buttons(assigns) do
    ~H"""
    <div class="space-y-2">
      <a
        href={~p"/auth/user/google"}
        data-testid="sign-in-google-link"
        class={[
          "w-full h-9 sm:h-10 rounded-md",
          "bg-auth-card hover:bg-auth-surface",
          "text-auth-fg font-medium text-sm",
          "flex items-center justify-center gap-2",
          "border border-auth-border",
          "shadow-xs transition-all",
          "focus:outline-none focus-visible:border-auth-ring focus-visible:ring-[3px] focus-visible:ring-auth-ring/50"
        ]}
      >
        <.google_icon />
        <span>{gettext("Continue with Google")}</span>
      </a>
    </div>
    """
  end

  # Inline Google SVG for brand compliance.
  defp google_icon(assigns) do
    ~H"""
    <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
    """
  end

  defp auth_footer(assigns) do
    ~H"""
    <footer class="px-4 sm:px-6 py-3">
      <p class="text-center text-auth-muted text-xs">
        {gettext("By continuing, you agree to our")}
        <a
          href="#"
          class="text-auth-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-auth-ring rounded-sm"
        >
          {gettext("Terms of Service")}
        </a>
        {gettext("and")}
        <a
          href="#"
          class="text-auth-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-auth-ring rounded-sm"
        >
          {gettext("Privacy Policy")}
        </a>
      </p>
    </footer>
    """
  end
end
