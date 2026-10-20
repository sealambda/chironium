defmodule Chironium.Accounts.Validations.ManagerInvitationEmailMatches do
  @moduledoc """
  A manager sees every patient in the organization, so a manager invitation can only
  be accepted or rejected by the account it was sent to. Member invitations work for
  anyone holding the code.
  """

  use Ash.Resource.Validation

  @impl true
  def validate(%{data: %{role: :power_user, email: email}}, _opts, context) do
    actor_email = context.actor && Map.get(context.actor, :email)

    if actor_email && Ash.CiString.compare(email, actor_email) == :eq do
      :ok
    else
      # The message doesn't name the invited address: the link holder may not be the invitee.
      {:error,
       field: :email,
       message:
         "This manager invitation was sent to a different email address. Sign in with the invited account."}
    end
  end

  def validate(_changeset, _opts, _context), do: :ok
end
