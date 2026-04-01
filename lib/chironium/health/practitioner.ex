defmodule Chironium.Health.Practitioner do
  @moduledoc """
  A person who is directly or indirectly involved in the provisioning of healthcare or related services.

  https://hl7.org/fhir/R5/practitioner.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "practitioners"
  end

  graphql do
    type :practitioner

    mutations do
      create :create_practitioner, :create

      update :update_practitioner, :update

      destroy :delete_practitioner, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:practitioner]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    # Org owners and power-user-role members can manage practitioners.
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    # Any authenticated actor in the org can read the practitioner list.
    policy action_type(:read) do
      authorize_if actor_present()
    end

    # Write actions are restricted to power users (bypassed above).
    policy action([:create, :update, :destroy]) do
      forbid_if always()
    end
  end

  attributes do
    attribute :name, {:array, Chironium.Datatypes.HumanName} do
      allow_nil? false
      public? true
    end

    attribute :active, :boolean do
      description "Whether this practitioner's record is in active use"
      public? true
    end

    attribute :birth_date, :date do
      public? true
    end
  end

  relationships do
    has_many :care_team_participations, Chironium.Health.CareTeamParticipant do
      description "Care teams where this practitioner participates"
      public? true
      destination_attribute :practitioner_id
    end
  end
end
