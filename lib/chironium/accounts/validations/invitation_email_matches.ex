defmodule Chironium.Accounts.Validations.InvitationEmailMatches do
  @moduledoc """
  An invitation that grants patient access can only be accepted or rejected by
  the account it was sent to: a manager sees every patient in the organization,
  and a principal grant (such as a practitioner) sees that principal's patients.
  Other member invitations work for anyone holding the code.
  """

  use Ash.Resource.Validation

  require Ash.Query

  alias Chironium.Accounts.PrincipalGrant

  @impl true
  def validate(%{data: invitation}, _opts, context) do
    if bound_to_email?(invitation) do
      actor_email = context.actor && Map.get(context.actor, :email)

      if actor_email && Ash.CiString.compare(invitation.email, actor_email) == :eq do
        :ok
      else
        # The message doesn't name the invited address: the link holder may not be the invitee.
        {:error,
         field: :email,
         message:
           "This invitation was sent to a different email address. Sign in with the invited account."}
      end
    else
      :ok
    end
  end

  defp bound_to_email?(%{role: :power_user}), do: true

  # Grants live in the organization's schema; the invitation lives in the public one.
  defp bound_to_email?(invitation) do
    PrincipalGrant
    |> Ash.Query.filter(invitation_id == ^invitation.id)
    |> Ash.exists?(authorize?: false, tenant: "org_#{invitation.organization_id}")
  end
end
