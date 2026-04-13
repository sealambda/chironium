defmodule Chironium.Health.CareTeamParticipant do
  @moduledoc """
  Participant relation for a CareTeam.
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "care_team_participants"
  end

  graphql do
    type :care_team_participant

    mutations do
      create :create_care_team_participant, :create
      update :update_care_team_participant, :update
      destroy :delete_care_team_participant, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:care_team_participant]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if Chironium.Health.Checks.CareTeamParticipantVisibleToActor
    end

    # Write actions are restricted to power users (bypassed above).
    policy action([:create, :update, :destroy]) do
      forbid_if always()
    end
  end

  attributes do
    attribute :active, :boolean do
      allow_nil? false
      default true
      public? true
    end

    attribute :role, :string do
      description "Role of the participant in the care team"
      public? true
    end
  end

  relationships do
    belongs_to :care_team, Chironium.Health.CareTeam do
      allow_nil? false
      public? true
    end

    belongs_to :practitioner, Chironium.Health.Practitioner do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_care_team_practitioner, [:care_team_id, :practitioner_id]
  end
end
