defmodule Chironium.Health.CareTeam do
  @moduledoc """
  Group of people and organizations with responsibility for a subject.

  https://build.fhir.org/careteam.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "care_teams"
  end

  archive do
    archive_related [:participants]
    archive_related_authorize? false
  end

  graphql do
    type :care_team

    queries do
      list :list_care_teams, :read
      get :get_care_team, :read
    end

    mutations do
      create :create_care_team, :create
      update :update_care_team, :update
      destroy :delete_care_team, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource, [:care_team]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if Chironium.Health.Checks.CareTeamVisibleToActor
    end

    # Write actions are restricted to power users (bypassed above).
    policy action([:create, :update, :destroy]) do
      forbid_if always()
    end
  end

  attributes do
    attribute :status, Chironium.Health.CareTeam.Status do
      description "Proposed, active, suspended, inactive, or entered in error"
      public? true
    end

    attribute :name, :string do
      description "Name of the care team"
      public? true
    end
  end

  relationships do
    belongs_to :subject_patient, Chironium.Health.Patient do
      description "The patient who is the subject of the care team"
      allow_nil? false
      writable? true
      public? true
    end

    has_many :participants, Chironium.Health.CareTeamParticipant do
      description "Participants in the care team"
      public? true
      destination_attribute :care_team_id
    end
  end
end
