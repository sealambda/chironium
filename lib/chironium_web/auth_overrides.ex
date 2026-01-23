defmodule ChironiumWeb.AuthOverrides do
  @moduledoc """
  UI overrides for AshAuthentication Phoenix components.

  Styled to match the client-side ShadCN UI design system:
  - OKLCH color palette with CSS custom properties.
  - Inter Variable font family.
  - Mobile-first responsive design (min 44px touch targets).
  - Consistent border radius (0.625rem base).
  - Shadow-xs and ring-based focus states.
  - Dark mode support.

  For a complete reference, see https://hexdocs.pm/ash_authentication_phoenix/ui-overrides.html
  """
  use AshAuthentication.Phoenix.Overrides

  alias AshAuthentication.Phoenix.{
    Components,
    SignInLive,
    ResetLive,
    ConfirmLive,
    MagicSignInLive
  }

  # ===========================================================================
  # LiveView Pages - Full-page containers
  # ===========================================================================

  override SignInLive do
    set :root_class,
        "min-h-svh flex items-center justify-center bg-background px-4 py-8 font-sans"
  end

  override ResetLive do
    set :root_class,
        "min-h-svh flex items-center justify-center bg-background px-4 py-8 font-sans"
  end

  override ConfirmLive do
    set :root_class,
        "min-h-svh flex items-center justify-center bg-background px-4 py-8 font-sans"
  end

  override MagicSignInLive do
    set :root_class,
        "min-h-svh flex items-center justify-center bg-background px-4 py-8 font-sans"
  end

  # ===========================================================================
  # Sign In Component - Main authentication container
  # ===========================================================================

  override Components.SignIn do
    set :root_class,
        "w-full max-w-sm mx-auto bg-card text-card-foreground rounded-xl shadow-xs ring-1 ring-foreground/10 p-6 sm:p-8 flex flex-col gap-6"

    set :strategy_class, "w-full"
    set :show_banner, true
    set :strategy_display_order, :forms_first
    set :authentication_error_container_class, "rounded-md bg-destructive/10 p-3 text-center"
    set :authentication_error_text_class, "text-sm text-destructive font-medium"
  end

  # ===========================================================================
  # Banner - Logo/branding
  # ===========================================================================

  override Components.Banner do
    set :root_class, "w-full flex justify-center mb-2"
    set :href_url, "/"
    set :href_class, "inline-flex items-center"

    # Text-based branding (set to nil and use image_url if you have logos).
    set :image_url, nil
    set :dark_image_url, nil
    set :image_class, "h-8 w-auto dark:hidden"
    set :dark_image_class, "h-8 w-auto hidden dark:block"

    # Small-caps style matching AppName component.
    set :text_class, "font-semibold text-2xl uppercase tracking-wide text-foreground"
    set :text, "CHIRONIUM"
  end

  # ===========================================================================
  # Password Strategy Components
  # ===========================================================================

  override Components.Password do
    set :root_class, "w-full flex flex-col gap-4"

    set :interstitial_class,
        "flex flex-row justify-between items-center text-sm font-medium gap-2"

    set :toggler_class,
        "text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"

    set :sign_in_toggle_text, "Already have an account?"
    set :register_toggle_text, "Need an account?"
    set :reset_toggle_text, "Forgot your password?"
    set :show_first, :sign_in
    set :hide_class, "hidden"
  end

  override Components.Password.SignInForm do
    set :root_class, "w-full"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :slot_class, "w-full"
    set :button_text, "Sign in"
    set :disable_button_text, "Signing in..."
  end

  override Components.Password.RegisterForm do
    set :root_class, "w-full"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :slot_class, "w-full"
    set :button_text, "Create account"
    set :disable_button_text, "Creating account..."
  end

  override Components.Password.ResetForm do
    set :root_class, "w-full"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :slot_class, "w-full"
    set :button_text, "Send reset link"
    set :disable_button_text, "Sending..."

    set :reset_flash_text,
        "If this user exists in our system, you will receive password reset instructions shortly."
  end

  # Input fields - Matching ShadCN Input component styles.
  override Components.Password.Input do
    set :field_class, "flex flex-col gap-2"

    set :label_class,
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"

    set :input_class,
        "h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base md:text-sm shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

    set :input_class_with_error,
        "h-9 w-full rounded-md border border-destructive bg-transparent px-2.5 py-1 text-base md:text-sm shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:border-destructive/50 dark:focus-visible:ring-destructive/40"

    set :submit_class,
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-2.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80 transition-all focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 w-full min-h-[44px] select-none cursor-pointer"

    set :identity_input_label, "Email"
    set :identity_input_placeholder, nil
    set :password_input_label, "Password"
    set :password_confirmation_input_label, "Confirm password"

    set :error_ul, "text-destructive text-sm mt-1 space-y-1"
    set :error_li, "text-sm"
    set :input_debounce, 350

    set :remember_me_class, "flex items-center gap-2 mt-1"
    set :remember_me_input_label, "Remember me"

    set :checkbox_class,
        "h-4 w-4 shrink-0 rounded border border-input shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 accent-primary"

    set :checkbox_label_class, "text-sm font-medium text-foreground select-none cursor-pointer"
  end

  # ===========================================================================
  # Magic Link Strategy
  # ===========================================================================

  override Components.MagicLink do
    set :root_class, "w-full flex flex-col gap-4"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :disable_button_text, "Sending link..."

    set :request_flash_text,
        "If this email exists in our system, you will receive a sign-in link shortly."

    set :remember_me_class, "flex items-center gap-2 mt-1"

    set :checkbox_class,
        "h-4 w-4 shrink-0 rounded border border-input shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 accent-primary"

    set :checkbox_label_class, "text-sm font-medium text-foreground select-none cursor-pointer"
  end

  override Components.MagicLink.Input do
    set :submit_class,
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-2.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80 transition-all focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 w-full min-h-[44px] select-none cursor-pointer"

    set :input_debounce, 350
    set :submit_label, "Send sign-in link"
    set :remember_me_class, "flex items-center gap-2 mt-1"
    set :remember_me_input_label, "Remember me"

    set :checkbox_class,
        "h-4 w-4 shrink-0 rounded border border-input shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 accent-primary"

    set :checkbox_label_class, "text-sm font-medium text-foreground select-none cursor-pointer"
  end

  # ===========================================================================
  # Magic Link Sign In (token confirmation page)
  # ===========================================================================

  override Components.MagicLink.SignIn do
    set :root_class,
        "w-full max-w-sm mx-auto bg-card text-card-foreground rounded-xl shadow-xs ring-1 ring-foreground/10 p-6 sm:p-8 flex flex-col gap-6"

    set :strategy_class, "w-full"
    set :show_banner, true
  end

  override Components.MagicLink.Form do
    set :root_class, "w-full"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :disable_button_text, "Signing in..."
  end

  # ===========================================================================
  # Reset/Confirm Components
  # ===========================================================================

  override Components.Reset do
    set :root_class,
        "w-full max-w-sm mx-auto bg-card text-card-foreground rounded-xl shadow-xs ring-1 ring-foreground/10 p-6 sm:p-8 flex flex-col gap-6"

    set :strategy_class, "w-full"
    set :show_banner, true
  end

  override Components.Reset.Form do
    set :root_class, "w-full"
    set :label_class, "text-2xl font-semibold tracking-tight text-foreground mb-2"
    set :form_class, "flex flex-col gap-4"
    set :spacer_class, "h-1"
    set :button_text, "Reset password"
    set :disable_button_text, "Resetting..."
  end

  override Components.Confirm do
    set :root_class,
        "w-full max-w-sm mx-auto bg-card text-card-foreground rounded-xl shadow-xs ring-1 ring-foreground/10 p-6 sm:p-8 flex flex-col gap-6"

    set :strategy_class, "w-full"
    set :show_banner, true
  end

  override Components.Confirm.Input do
    set :submit_class,
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-2.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80 transition-all focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 w-full min-h-[44px] select-none cursor-pointer"
  end

  # ===========================================================================
  # OAuth2 Components
  # ===========================================================================

  override Components.OAuth2 do
    set :root_class, "w-full"

    set :link_class,
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-2.5 gap-2 border border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 shadow-xs transition-all focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 w-full min-h-[44px] select-none"

    set :icon_class, "h-4 w-4 shrink-0"
    set :icon_src, nil
  end

  override Components.Apple do
    set :root_class, "w-full"

    set :link_class,
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-2.5 gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-xs transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 w-full min-h-[44px] select-none"

    set :icon_class, "h-5 w-5 shrink-0"
  end

  # ===========================================================================
  # Utility Components
  # ===========================================================================

  override Components.HorizontalRule do
    set :root_class, "relative my-4"
    set :hr_outer_class, "absolute inset-0 flex items-center"
    set :hr_inner_class, "w-full border-t border-border"
    set :text_outer_class, "relative flex justify-center text-xs"

    set :text_inner_class,
        "px-2 bg-card text-muted-foreground font-medium uppercase tracking-wider"

    set :text, "or"
  end

  override Components.Flash do
    # Info flash (success/confirmation).
    set :message_class_info,
        "fixed top-4 right-4 z-50 w-80 sm:w-96 bg-card text-card-foreground rounded-xl shadow-md ring-1 ring-foreground/10 p-4 text-sm"

    # Error flash.
    set :message_class_error,
        "fixed top-4 right-4 z-50 w-80 sm:w-96 bg-destructive/10 text-destructive rounded-xl shadow-md ring-1 ring-destructive/20 p-4 text-sm font-medium"
  end
end
