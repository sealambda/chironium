defmodule Chironium.Accounts.Invitation do
  require Ash.Resource.Change.Builtins

  @doc """
  Represents an invitation to a user to join an organization.
  """
  use Chironium.BaseResources.Auditable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshGraphql.Resource,
      AshPaperTrail.Resource,
      AshArchival.Resource,
      AshStateMachine
    ]

  postgres do
    table "invitations"
    # Needed so the unique indexes become partial (WHERE archived_at IS NULL),
    # allowing the same email to be re-invited after a rejection or acceptance.
    base_filter_sql "archived_at IS NULL"
  end

  # Invite codes are credentials: anyone holding one can join the organization.
  field_policies do
    field_policy [:invite_code, :accept_url] do
      authorize_if expr(actor_is_organization_admin)
    end

    field_policy :* do
      authorize_if always()
    end
  end

  graphql do
    type :invitation

    mutations do
      update :accept_invitation, :accept,
        identity: false,
        read_action: :get_by_invite_code

      update :reject_invitation, :reject,
        identity: false,
        read_action: :get_by_invite_code

      update :revoke_invitation, :revoke
      update :renew_invitation, :renew
    end
  end

  paper_trail do
    # Versions written before `invite_code` became sensitive still hold codes.
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource,
           [:invitation, :organization_admins]}
  end

  state_machine do
    initial_states [:pending]
    default_initial_state :pending

    transitions do
      transition :accept, from: :pending, to: :accepted
      transition :reject, from: :pending, to: :rejected
      transition :revoke, from: :pending, to: :rejected
      transition :renew, from: :pending, to: :pending
    end
  end

  actions do
    defaults [:read, :destroy]

    read :current_email_invitation do
      description "Find invitation for the current email address"

      filter expr(email == ^actor(:email) and state == :pending and expires_at > now())
    end

    read :get_by_invite_code do
      description "Get an invitation by invite code"

      get_by :invite_code
    end

    create :create do
      description "Create an invitation to join an organization - the user may already exist or not"

      primary? true
      accept [:email, :role]

      argument :principal_grants, {:array, Chironium.Accounts.PrincipalGrantInput} do
        description "Optional principal grants to pre-create for the invited user."
        allow_nil? false
        default []
      end

      change relate_actor(:invited_by)

      # Create invitation-linked PrincipalGrant records so the power user can
      # attach grants at invite time. The tenant is derived from organization_id
      # because the invitation itself lives in the public schema (no tenant).
      change after_action(fn changeset, result, _context ->
               tenant = "org_#{result.organization_id}"
               grants_input = Ash.Changeset.get_argument(changeset, :principal_grants) || []

               Enum.reduce_while(grants_input, {:ok, result}, fn grant_input, {:ok, acc} ->
                 case Chironium.Accounts.PrincipalGrant
                      |> Ash.Changeset.for_create(
                        :create,
                        %{
                          invitation_id: result.id,
                          principal_type: grant_input.principal_type,
                          principal_id: grant_input.principal_id
                        },
                        authorize?: false,
                        tenant: tenant
                      )
                      |> Ash.create() do
                   {:ok, _} -> {:cont, {:ok, acc}}
                   {:error, error} -> {:halt, {:error, error}}
                 end
               end)
             end)

      change after_action(fn changeset, result, context ->
               send_invitation_email(changeset, result, context)
             end)
    end

    update :accept do
      description "Accept an invitation to join an organization"

      accept []
      require_atomic? false
      validate Chironium.Accounts.Validations.InvitationNotExpired
      validate Chironium.Accounts.Validations.InvitationEmailMatches
      change transition_state(:accepted)
      change set_attribute(:invite_code, nil)

      change after_action(fn _changeset, result, context ->
               tenant = "org_#{result.organization_id}"

               Ash.Changeset.for_create(
                 Chironium.Accounts.OrganizationUsers,
                 :create,
                 %{
                   organization_id: result.organization_id,
                   user_id: context.actor.id,
                   role: result.role
                 },
                 authorize?: false
               )
               |> Ash.create!(
                 upsert?: true,
                 upsert_identity: :unique_organization_user
               )

               # Convert every invitation-linked grant to a user-linked grant, granting
               # the new member access to the associated principals immediately.
               pending_grants =
                 Chironium.Accounts.PrincipalGrant
                 |> Ash.Query.filter_input(%{invitation_id: result.id})
                 |> Ash.read!(authorize?: false, tenant: tenant)

               Enum.each(pending_grants, fn grant ->
                 # Check upfront whether the user already has a matching user-linked grant.
                 # This avoids triggering a unique constraint violation inside the current
                 # PostgreSQL transaction, which would leave it in an aborted state.
                 existing =
                   Chironium.Accounts.PrincipalGrant
                   |> Ash.Query.filter_input(%{
                     user_id: context.actor.id,
                     principal_type: grant.principal_type,
                     principal_id: grant.principal_id
                   })
                   |> Ash.read_one!(authorize?: false, tenant: tenant)

                 if existing do
                   # User already has a matching grant; remove the redundant
                   # invitation-linked one (with its paper trail version records).
                   revoke_invitation_grant(grant.id, tenant)
                 else
                   # No conflict; update in-place to assign the grant to the new user.
                   Ash.Changeset.for_update(
                     grant,
                     :update,
                     %{user_id: context.actor.id, invitation_id: nil},
                     authorize?: false,
                     tenant: tenant
                   )
                   |> Ash.update!()
                 end
               end)

               # Archive the accepted invitation so the same email can be re-invited later.
               Ash.destroy!(result, authorize?: false)

               {:ok, result}
             end)
    end

    update :reject do
      description "Reject an invitation to join an organization"

      accept []
      require_atomic? false
      validate Chironium.Accounts.Validations.InvitationEmailMatches
      change transition_state(:rejected)
      change set_attribute(:invite_code, nil)

      # Archive the rejected invitation so the same email can be re-invited later.
      change after_action(fn _changeset, result, _context ->
               Ash.destroy!(result, authorize?: false)
               {:ok, result}
             end)
    end

    update :revoke do
      description "Revoke a pending invitation"

      accept []
      require_atomic? false
      change transition_state(:rejected)
      change set_attribute(:invite_code, nil)

      # Archive the revoked invitation so the same email can be re-invited later.
      change after_action(fn _changeset, result, _context ->
               Ash.destroy!(result, authorize?: false)
               {:ok, result}
             end)
    end

    update :renew do
      description "Give a pending invitation a new code and a new 7-day expiry, and email it again"

      accept []
      require_atomic? false
      change transition_state(:pending)

      change fn changeset, _context ->
        Ash.Changeset.force_change_attributes(changeset,
          invite_code: generate_invite_code(),
          expires_at: default_expires_at()
        )
      end

      change after_action(fn changeset, result, context ->
               send_invitation_email(changeset, result, context)
             end)
    end

    action :accept_by_invite_code, :struct do
      description "Accept an invitation with only an invite code"

      argument :invite_code, :ci_string do
        allow_nil? false
      end

      run fn input, context ->
        invite_code = input.arguments.invite_code
        update_invitation_by_invite_code(invite_code, :accept, context)
      end
    end

    action :reject_by_invite_code, :struct do
      description "Reject an invitation with only an invite code"

      argument :invite_code, :ci_string do
        allow_nil? false
      end

      run fn input, context ->
        invite_code = input.arguments.invite_code
        update_invitation_by_invite_code(invite_code, :reject, context)
      end
    end
  end

  policies do
    # When a user already has access to the organization, they can create invitations.
    policy action(:create) do
      # TODO: Only organization owners can create and see invitations
      authorize_if accessing_from(Chironium.Accounts.Organization, :invitations)
    end

    # Users can read invitations when they already belong to the organization
    # or when the invitation targets their email address.
    policy action(:read) do
      authorize_if Chironium.Accounts.Checks.PowerUser
      authorize_if accessing_from(Chironium.Accounts.Organization, :invitations)
      authorize_if expr(email == ^actor(:email))
    end

    policy action([
             :accept,
             :accept_by_invite_code,
             :reject,
             :reject_by_invite_code,
             :current_email_invitation,
             :get_by_invite_code
           ]) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end

    policy action(:revoke) do
      authorize_if Chironium.Accounts.Checks.PowerUser
    end

    # Checked against the invitation's own organization, not the request's tenant: the
    # renewed code is returned to the caller.
    policy action(:renew) do
      authorize_if expr(actor_is_organization_admin)
    end

    # Account records are staff-only; portal actors such as a Patient never pass.
    policy always() do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end
  end

  attributes do
    attribute :email, :ci_string do
      public? true
      constraints casing: :lower
    end

    attribute :invite_code, :ci_string do
      description "The code that the user will use to accept the invitation"
      public? true
      sensitive? true
      default fn -> generate_invite_code() end
    end

    attribute :expires_at, :utc_datetime do
      public? true
      default fn -> default_expires_at() end
    end

    attribute :role, Chironium.Accounts.OrganizationUser.Role do
      description "Organization role assigned when the invitation is accepted."
      public? true
      allow_nil? false
      default :member
    end
  end

  relationships do
    belongs_to :organization, Chironium.Accounts.Organization do
      allow_nil? false
      public? true
    end

    belongs_to :invited_by, Chironium.Accounts.User do
      allow_nil? false
      public? true
    end

    has_many :principal_grants, Chironium.Accounts.PrincipalGrant do
      description "Principal grants created for this invitation (tenant-scoped). Resolves on acceptance."
      destination_attribute :invitation_id
      public? true
    end
  end

  calculations do
    calculate :accept_url, :string, Chironium.Accounts.Invitation.Calculations.AcceptUrl do
      description "The app link that opens the accept dialog with this invitation's code"
      public? true
    end

    # Field policies can't reference relationships, so the admin check lives here.
    calculate :actor_is_organization_admin,
              :boolean,
              expr(
                organization.owner_id == ^actor(:id) or
                  exists(
                    organization.organization_users,
                    user_id == ^actor(:id) and role == :power_user
                  )
              )
  end

  identities do
    identity :unique_invitation, [:organization_id, :email]
    identity :unique_invite_code, [:invite_code]
  end

  defp generate_invite_code, do: Base.encode32(:crypto.strong_rand_bytes(5))

  defp default_expires_at, do: DateTime.add(DateTime.utc_now(), 7, :day)

  defp send_invitation_email(_changeset, result, context) do
    invited_by = context.actor
    result = Ash.load!(result, [:organization, :accept_url], authorize?: false)

    # Prefer the invitee's own locale when the user already exists on
    # the platform; otherwise fall back to the organization's locale.
    locale = resolve_invitee_locale(result.email, result.organization)

    Chironium.Notifications.send(:invitation_created, %{
      email: to_string(result.email),
      invited_by_name: invited_by.name || to_string(invited_by.email),
      organization_name: result.organization.name,
      code: result.invite_code,
      accept_url: result.accept_url,
      locale: locale
    })

    {:ok, result}
  end

  # Cascade-deletes an invitation-linked PrincipalGrant and its AshPaperTrail
  # version records. Ash.destroy!/1 is blocked by the FK from
  # `principal_grants_versions.version_source_id` to `principal_grants.id`.
  defp revoke_invitation_grant(grant_id, tenant) do
    import Ecto.Query, only: [from: 2]

    # Raw Ecto queries expect binary UUIDs, not string UUIDs.
    id_bin = Ecto.UUID.dump!(grant_id)

    Chironium.Repo.delete_all(
      from(v in "principal_grants_versions", where: v.version_source_id == ^id_bin),
      prefix: tenant
    )

    Chironium.Repo.delete_all(
      from(g in "principal_grants", where: g.id == ^id_bin),
      prefix: tenant
    )
  end

  defp update_invitation_by_invite_code(invite_code, ash_action, context) do
    invitation_query =
      __MODULE__
      |> Ash.Query.for_read(:get_by_invite_code, %{invite_code: invite_code})

    with {:ok, invitation} when not is_nil(invitation) <-
           Ash.read_one(invitation_query, actor: context.actor) do
      Ash.update(invitation, %{}, action: ash_action, actor: context.actor)
    else
      {:ok, nil} -> {:error, :invalid_invite_code}
      error -> error
    end
  end

  # Resolve the locale used for the invitation email. When the invitee is
  # already a platform user we honour their personal preference; otherwise we
  # fall back to the organization's preferred locale so the recipient reads the
  # email in the language chosen by the org admins.
  defp resolve_invitee_locale(email, %Chironium.Accounts.Organization{} = organization) do
    case lookup_user_locale_by_email(email) do
      {:ok, locale} -> locale
      :not_found -> organization.preferred_locale || "en"
    end
  end

  defp lookup_user_locale_by_email(email) do
    case Chironium.Accounts.User
         |> Ash.Query.for_read(:get_by_email, %{email: email})
         |> Ash.read_one(authorize?: false) do
      {:ok, %Chironium.Accounts.User{preferred_locale: locale}} when is_binary(locale) ->
        {:ok, locale}

      _ ->
        :not_found
    end
  end
end
