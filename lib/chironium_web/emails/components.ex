defmodule ChironiumWeb.Emails.Components do
  @moduledoc """
  Shared components for email templates.

  Uses CSS class selectors in a `<style>` block. Premailex inlines
  these styles at render time so they work in email clients that
  strip `<style>` tags.
  """

  use Phoenix.Component
  use Gettext, backend: ChironiumWeb.Gettext

  @doc "Full HTML document wrapper for emails."
  slot :inner_block, required: true

  def email_layout(assigns) do
    ~H"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .email-card {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
          }
          .email-footer {
            text-align: center;
            padding: 24px 0 0;
            color: #71717a;
            font-size: 13px;
            line-height: 1.5;
          }
          .email-heading {
            font-size: 24px;
            font-weight: 700;
            color: #18181b;
            margin: 0 0 16px;
            line-height: 1.3;
          }
          .email-text {
            font-size: 16px;
            line-height: 1.6;
            color: #3f3f46;
            margin: 0 0 16px;
          }
          .email-button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 6px;
            margin: 8px 0;
          }
          .email-muted {
            font-size: 14px;
            color: #71717a;
            line-height: 1.5;
          }
          .email-divider {
            border: none;
            border-top: 1px solid #e4e4e7;
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-card">
            {render_slot(@inner_block)}
          </div>
          <div class="email-footer">
            {dgettext("emails", "Sent by Chironium")}
          </div>
        </div>
      </body>
    </html>
    """
  end

  @doc "Primary call-to-action button."
  attr :href, :string, required: true
  slot :inner_block, required: true

  def email_button(assigns) do
    ~H"""
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      <tr>
        <td>
          <a href={@href} class="email-button">{render_slot(@inner_block)}</a>
        </td>
      </tr>
    </table>
    """
  end
end
