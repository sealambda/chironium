defmodule Chironium.Accounts.PrincipalGrant do
  @moduledoc """
  Maps a user (or a pending invitation) to a principal within an organization.

  A grant is always in one of two states:

  - **Invitation-linked** — `invitation_id` is set, `user_id` is nil. Created
    when an invitation carrying principal grants is sent. No user has access yet.
  - **User-linked** — `user_id` is set, `invitation_id` is nil. Either created
    directly by a power user, or transitioned from invitation-linked when the
    invitation is accepted.

  Exactly one of `user_id`/`invitation_id` must be set; this is enforced by a
  before-action hook on every create action.
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshAdmin.Resource, AshPaperTrail.Resource, AshGraphql.Resource]

  admin do
    actor? true
  end

  postgres do
    table "principal_grants"

    # Prevent duplicate invitation-linked grants for the same principal.
    # NULL invitation_id values are excluded so the index does not block
    # user-linked grants (which have invitation_id = NULL).
    custom_indexes do
      index [:invitation_id, :principal_type, :principal_id],
        unique: true,
        where: "invitation_id IS NOT NULL",
        name: "principal_grants_unique_invitation_principal_index"
    end
  end

  graphql do
    type :principal_grant

    mutations do
      create :create_principal_grant, :create
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:principal_grant]}
  end

  actions do
    defaults [:read, :destroy, update: :*]

    # Standard create: used by power users assigning grants directly, and by
    # the invitation after-action to create invitation-linked (pending) grants.
    # Validates that the referenced principal exists in the current tenant.
    create :create do
      primary? true
      accept [:user_id, :invitation_id, :principal_type, :principal_id, :active]

      change fn changeset, _context ->
        Ash.Changeset.before_action(changeset, &validate_principal_source/1)
      end

      change Chironium.Accounts.Validations.PrincipalExistsInOrg
    end

    # Lightweight create used exclusively in the invitation accept after-action:
    # converts an invitation-linked grant into a user-linked grant. Skips the
    # existence re-check since the principal was already validated at invite time.
    create :link_to_user do
      accept [:user_id, :principal_type, :principal_id, :active]

      change fn changeset, _context ->
        Ash.Changeset.before_action(changeset, &validate_principal_source/1)
      end
    end
  end

  policies do
    # Org owners and power-user-role members can manage all grants.
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    # Regular members may read only their own grants.
    policy action_type(:read) do
      authorize_if expr(user_id == ^actor(:id))
    end

    # No member may self-assign or modify grants; only power users (bypassed above) can.
    policy action([:create, :update, :destroy]) do
      forbid_if always()
    end
  end

  attributes do
    attribute :principal_type, Chironium.Accounts.PrincipalType do
      allow_nil? false
      public? true
    end

    attribute :principal_id, :uuid do
      allow_nil? false
      public? true
    end

    attribute :active, :boolean do
      allow_nil? false
      public? true
      default true
    end
  end

  relationships do
    belongs_to :user, Chironium.Accounts.User do
      # Nil when the grant is invitation-linked (pending acceptance).
      allow_nil? true
      public? true
    end

    belongs_to :invitation, Chironium.Accounts.Invitation do
      # Nil once the grant is linked to a user.
      allow_nil? true
      public? true
    end
  end

  identities do
    # User-linked grant uniqueness. PostgreSQL treats NULL as distinct in unique
    # indexes, so invitation-linked grants (user_id = NULL) are not constrained
    # by this identity — the custom index above handles their deduplication.
    identity :unique_user_principal_grant,
             [:user_id, :principal_type, :principal_id]
  end

  defp validate_principal_source(changeset) do
    user_id = Ash.Changeset.get_attribute(changeset, :user_id)
    invitation_id = Ash.Changeset.get_attribute(changeset, :invitation_id)

    case {is_nil(user_id), is_nil(invitation_id)} do
      {true, true} ->
        Ash.Changeset.add_error(changeset,
          field: :user_id,
          message: "either user_id or invitation_id must be set"
        )

      {false, false} ->
        Ash.Changeset.add_error(changeset,
          field: :invitation_id,
          message: "only one of user_id or invitation_id may be set"
        )

      _ ->
        changeset
    end
  end
end
