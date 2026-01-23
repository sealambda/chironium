defmodule Chironium.Core.Identity.Senders.MagicLinkSender do
  @moduledoc """
  Sends magic link emails for passwordless authentication.

  Implements the `AshAuthentication.Sender` behaviour to deliver
  magic link tokens via email using Swoosh.

  In development, also logs the link to console for testing.
  """
  use AshAuthentication.Sender

  import Chironium.Core.Identity.Senders.UrlHelpers

  import Swoosh.Email

  require Logger

  @impl true
  @spec send(
          Ash.Resource.record(),
          String.t(),
          keyword()
        ) :: :ok | {:error, term()}
  def send(user, token, _opts) do
    magic_link_url = build_magic_link_url(token)

    Logger.info("Magic link requested for #{user.email}")

    # In development, also log to console for easy testing.
    if Application.get_env(:chironium, :env) == :dev do
      IO.puts("""

      ========================================
      MAGIC LINK FOR: #{user.email}
      ========================================
      #{magic_link_url}
      ========================================

      """)
    end

    # Build and send the email.
    email = build_email(user.email, magic_link_url)

    case Chironium.Mailer.deliver(email) do
      {:ok, _} ->
        Logger.debug("Magic link email sent to #{user.email}")
        :ok

      {:error, reason} ->
        Logger.error("Failed to send magic link email to #{user.email}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp build_email(to_email, magic_link_url) do
    from_email = get_from_email()

    new()
    |> to(to_email)
    |> from(from_email)
    |> subject("Your sign-in link for Chironium")
    |> html_body(html_template(magic_link_url))
    |> text_body(text_template(magic_link_url))
  end

  defp html_template(magic_link_url) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Chironium</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="margin-top: 0; color: #333;">Sign in to your account</h2>

        <p>Click the button below to sign in to Chironium. This link will expire in 10 minutes.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#{magic_link_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Sign In
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
          #{magic_link_url}
        </p>

        <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; margin-bottom: 0;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
    """
  end

  defp text_template(magic_link_url) do
    """
    Sign in to Chironium
    =====================

    Click the link below to sign in to your account. This link will expire in 10 minutes.

    #{magic_link_url}

    If you didn't request this email, you can safely ignore it.
    """
  end

  defp build_magic_link_url(token) do
    base_url = get_base_url()
    "#{base_url}/auth/user/magic_link?token=#{token}"
  end

  defp get_from_email do
    Application.get_env(:chironium, :from_email, {"Chironium", "noreply@chironium.app"})
  end
end
