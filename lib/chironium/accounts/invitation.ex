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
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource, AshStateMachine]

  postgres do
    table "invitations"
  end

  graphql do
    type :invitation

    queries do
      list :find_current_email_invitations, :current_email_invitation
    end

    mutations do
      update :accept_invitation, :accept,
        identity: false,
        read_action: :get_by_invite_code
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:invitation]}
  end

  state_machine do
    initial_states [:pending]
    default_initial_state :pending

    transitions do
      transition :accept, from: :pending, to: :accepted
      transition :reject, from: :pending, to: :rejected
    end
  end

  actions do
    defaults [:read, :destroy]

    read :current_email_invitation do
      description "Find invitation for the current email address"

      filter expr(email == ^actor(:email) and state == :pending)
    end

    read :get_by_invite_code do
      description "Get an invitation by invite code"

      get_by :invite_code
    end

    create :create do
      description "Create an invitation to join an organization - the user may already exist or not"

      primary? true
      accept [:email]

      change relate_actor(:invited_by)

      # TODO Send email invitations
    end

    update :accept do
      description "Accept an invitation to join an organization"

      accept []
      require_atomic? false
      change transition_state(:accepted)
      change set_attribute(:invite_code, nil)

      change after_action(fn _changeset, result, context ->
               Ash.Changeset.for_create(
                 Chironium.Accounts.OrganizationUsers,
                 :create,
                 %{
                   organization_id: result.organization_id,
                   user_id: context.actor.id
                 },
                 authorize?: false
               )
               |> Ash.create!()

               {:ok, result}
             end)
    end

    update :reject do
      description "Reject an invitation to join an organization"

      accept []
      change transition_state(:rejected)
      change set_attribute(:invite_code, nil)
    end

    action :accept_by_invite_code, :struct do
      description "Accept an invitation with only an invite code"

      argument :invite_code, :ci_string do
        allow_nil? false
      end

      run fn input, context ->
        invite_code = input.arguments.invite_code

        invitation_query =
          __MODULE__
          |> Ash.Query.for_read(:get_by_invite_code, %{invite_code: invite_code})

        with {:ok, invitation} when not is_nil(invitation) <-
               Ash.read_one(invitation_query, actor: context.actor) do
          Ash.update(
            invitation,
            %{},
            action: :accept,
            actor: context.actor
          )
        else
          {:ok, nil} -> {:error, :invalid_invite_code}
          error -> error
        end
      end
    end

    action :reject_by_invite_code, :struct do
      description "Reject an invitation with only an invite code"

      argument :invite_code, :ci_string do
        allow_nil? false
      end

      run fn input, context ->
        invite_code = input.arguments.invite_code

        invitation_query =
          __MODULE__
          |> Ash.Query.for_read(:get_by_invite_code, %{invite_code: invite_code})

        with {:ok, invitation} when not is_nil(invitation) <-
               Ash.read_one(invitation_query, actor: context.actor) do
          Ash.update(
            invitation,
            %{},
            action: :reject,
            actor: context.actor
          )
        else
          {:ok, nil} -> {:error, :invalid_invite_code}
          error -> error
        end
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
      authorize_if actor_present()
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
      default fn -> Base.encode32(:crypto.strong_rand_bytes(5)) end
    end

    attribute :expires_at, :utc_datetime do
      public? true
      default fn -> DateTime.add(DateTime.utc_now(), 7, :day) end
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
  end

  identities do
    identity :unique_invitation, [:organization_id, :email]
    identity :unique_invite_code, [:invite_code]
  end
end
