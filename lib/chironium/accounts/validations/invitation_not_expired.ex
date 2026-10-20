defmodule Chironium.Accounts.Validations.InvitationNotExpired do
  @moduledoc """
  Rejects accepting an invitation whose `expires_at` has passed. A `NULL` expiry,
  left by rows created before the column had a default, counts as expired.
  """

  use Ash.Resource.Validation

  @impl true
  def validate(changeset, _opts, _context) do
    case changeset.data.expires_at do
      %DateTime{} = expires_at ->
        if DateTime.after?(expires_at, DateTime.utc_now()) do
          :ok
        else
          {:error,
           field: :expires_at,
           message:
             "Invitation expired on #{Date.to_iso8601(expires_at)}. Ask an organization manager for a new one."}
        end

      nil ->
        {:error,
         field: :expires_at,
         message: "Invitation expired. Ask an organization manager for a new one."}
    end
  end
end
