defmodule Chironium.Accounts.Invitation.Calculations.AcceptUrl do
  @moduledoc """
  The app link that opens the accept dialog prefilled with the invitation's code,
  or `nil` once the invitation is accepted, rejected or revoked.
  """

  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context), do: [:invite_code]

  @impl true
  def calculate(invitations, _opts, _context) do
    Enum.map(invitations, fn
      %{invite_code: nil} -> nil
      %{invite_code: code} -> ChironiumWeb.AppUrl.url("", inviteCode: code)
    end)
  end
end
