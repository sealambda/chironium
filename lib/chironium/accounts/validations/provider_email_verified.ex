defmodule Chironium.Accounts.Validations.ProviderEmailVerified do
  @moduledoc """
  Accepts an identity provider sign-in only when the provider has verified the
  email address. Accounts are matched by email across sign-in methods, so an
  unverified address would hand an existing account to whoever typed it.
  """

  use Ash.Resource.Validation

  @message "Your sign-in provider has not verified this email address. Verify it with the provider, or sign in another way."

  @impl true
  def validate(changeset, _opts, _context) do
    # Some providers send the claim as a string.
    case Ash.Changeset.get_argument(changeset, :user_info) do
      %{"email_verified" => verified} when verified in [true, "true"] -> :ok
      _ -> {:error, field: :email, message: @message}
    end
  end

  @doc "The error message, for showing on the sign-in page."
  def message, do: @message
end
