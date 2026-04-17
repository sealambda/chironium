defmodule ChironiumWeb.Emails.InvitationEmailTest do
  use ExUnit.Case, async: true

  alias Chironium.Mailer.Renderer

  test "renders invitation email with all fields" do
    %{html: html, text: text} =
      Renderer.render(&ChironiumWeb.Emails.InvitationEmail.render/1, %{
        invited_by_name: "Alice",
        organization_name: "Acme Corp",
        code: "ABC123",
        accept_url: "https://app.chironium.app/invitations/ABC123"
      })

    # HTML contains key content.
    assert html =~ "Alice"
    assert html =~ "Acme Corp"
    assert html =~ "https://app.chironium.app/invitations/ABC123"
    assert html =~ "ABC123"
    assert html =~ "Accept invitation"

    # Premailex inlined styles from the <style> block.
    assert html =~ "style="

    # Plain text fallback is readable.
    assert text =~ "Alice"
    assert text =~ "Acme Corp"
    assert text =~ "Accept invitation"
  end
end
