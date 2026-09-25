defmodule Chironium.Accounts.GuestAccess.Changes.RevokeTokens do
  @moduledoc """
  Revokes every stored token minted for the access: unused links and live
  sessions alike. `require_token_presence_for_authentication?` then rejects the
  session on its next request.
  """

  use Ash.Resource.Change

  require Ash.Query

  alias Chironium.Accounts.Token

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, fn _changeset, guest_access ->
      subject = AshAuthentication.user_to_subject(guest_access)

      Token
      |> Ash.Query.filter(subject == ^subject and purpose != "revocation")
      |> Ash.bulk_update(:revoke_all_stored_for_subject, %{subject: subject},
        context: %{private: %{ash_authentication?: true}},
        strategy: [:atomic, :atomic_batches, :stream],
        return_errors?: true,
        stop_on_error?: true
      )
      |> case do
        %Ash.BulkResult{status: :success} -> {:ok, guest_access}
        %Ash.BulkResult{errors: errors} -> {:error, errors}
      end
    end)
  end
end
