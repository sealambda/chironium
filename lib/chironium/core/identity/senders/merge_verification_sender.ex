defmodule Chironium.Core.Identity.Senders.MergeVerificationSender do
  @moduledoc """
  Sends verification emails for account merge requests.

  When a user initiates an account merge, this sender delivers
  a verification link to the target email address.
  """
  import Swoosh.Email
  import Chironium.Core.Identity.Senders.UrlHelpers

  require Logger

  @doc """
  Send merge verification email to the target email.
  """
  @spec send_verification(String.t(), String.t(), String.t()) :: :ok | {:error, term()}
  def send_verification(to_email, verification_token, initiator_email) do
    verification_url = build_verification_url(verification_token)

    Logger.info("Merge verification requested for #{to_email} from #{initiator_email}")

    # In development, also log to console.
    if Application.get_env(:chironium, :env) == :dev do
      IO.puts("""

      ========================================
      MERGE VERIFICATION FOR: #{to_email}
      Requested by: #{initiator_email}
      ========================================
      #{verification_url}
      ========================================

      """)
    end

    email = build_email(to_email, verification_url, initiator_email)

    case Chironium.Mailer.deliver(email) do
      {:ok, _} ->
        Logger.debug("Merge verification email sent to #{to_email}")
        :ok

      {:error, reason} ->
        Logger.error("Failed to send merge verification to #{to_email}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp build_email(to_email, verification_url, initiator_email) do
    from_email = get_from_email()

    new()
    |> to(to_email)
    |> from(from_email)
    |> subject("Confirm account link request - Chironium")
    |> html_body(html_template(verification_url, initiator_email))
    |> text_body(text_template(verification_url, initiator_email))
  end

  defp html_template(verification_url, initiator_email) do
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
        <h2 style="margin-top: 0; color: #333;">Account Link Request</h2>

        <p>Someone using <strong>#{initiator_email}</strong> has requested to link this email address to their Chironium account.</p>

        <p>If this was you, click the button below to confirm and link your accounts. This will merge your profiles, allowing you to sign in with either email.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#{verification_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Confirm &amp; Link Accounts
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⚠️ Important:</strong> Only click this link if you initiated this request. This action cannot be undone.
          </p>
        </div>

        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
          #{verification_url}
        </p>

        <p style="color: #666; font-size: 14px;">
          This link will expire in 24 hours.
        </p>

        <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; margin-bottom: 0;">
          If you didn't request this, you can safely ignore this email. Your account will not be affected.
        </p>
      </div>
    </body>
    </html>
    """
  end

  defp text_template(verification_url, initiator_email) do
    """
    Account Link Request - Chironium
    =================================

    Someone using #{initiator_email} has requested to link this email address
    to their Chironium account.

    If this was you, click the link below to confirm and link your accounts:

    #{verification_url}

    IMPORTANT: Only click this link if you initiated this request.
    This action cannot be undone.

    This link will expire in 24 hours.

    If you didn't request this, you can safely ignore this email.
    Your account will not be affected.
    """
  end

  defp build_verification_url(token) do
    base_url = get_base_url()
    "#{base_url}/auth/merge/verify?token=#{token}"
  end

  defp get_from_email do
    Application.get_env(:chironium, :from_email, {"Chironium", "noreply@chironium.app"})
  end
end
