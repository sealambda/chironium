defmodule Chironium.Health.Questionnaire do
  @moduledoc """
  An organized collection of questions intended to solicit information from patients,
  practitioners, or others.

  This is a *definition* resource shared across the organization: any practitioner in the
  tenant can author and use it. The recursive `item` tree (groups, questions, `enableWhen`
  logic, answer options) is stored as JSON rather than typed embedded resources because
  AshGraphql cannot generate a self-referential embedded type
  (`get_nested_embedded_types/1` has no cycle guard). JSON mirrors FHIR's own
  serialization, supports arbitrary nesting, and is validated by
  `Chironium.Health.Questionnaire.Validations.ValidItemTree`. Keys use FHIR's camelCase
  JSON form (`linkId`, `enableWhen`, `answerOption`, …).

  https://hl7.org/fhir/R5/questionnaire.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  alias Chironium.Health.Questionnaire.Validations.ValidItemTree

  postgres do
    table "questionnaires"
  end

  archive do
    # Deleting a questionnaire archives it, but the responses already recorded against it
    # are kept (and still shown on the patient's timeline). Their `questionnaire`
    # relationship therefore has to keep resolving after the archival.
    exclude_read_actions [:read_including_archived]
  end

  graphql do
    type :questionnaire

    # `item` is the recursive FHIR item tree. Output stays the structured `Json` scalar
    # (a bare `:map` would default to `JsonString`). Input is a typed, recursive Absinthe
    # input object (`:questionnaire_item_input`, defined in the schema) — Absinthe scalars
    # cannot receive structured values, so a typed input object is the only way to accept
    # real nested objects. Its coerced snake_case atom keys are normalized to FHIR
    # camelCase by `CamelizeJsonKeys` before validation.
    attribute_types item: {:array, :json}
    attribute_input_types item: {:array, :questionnaire_item_input}

    queries do
      get :get_questionnaire, :read
      list :list_questionnaires, :read
    end

    mutations do
      create :create_questionnaire, :create

      update :update_questionnaire, :update

      destroy :delete_questionnaire, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource, [:questionnaire]}
  end

  actions do
    defaults [:read, :destroy]

    read :read_including_archived do
      description "Reads archived (deleted) questionnaires too. Used to label kept responses."
    end

    create :create do
      primary? true
      accept [:status, :title, :name, :url, :version, :date, :description, :code, :item]

      change {Chironium.Health.Changes.CamelizeJsonKeys, attribute: :item}
      validate ValidItemTree
    end

    update :update do
      primary? true
      # The JSON tree is validated by a non-atomic validation.
      require_atomic? false
      accept [:status, :title, :name, :url, :version, :date, :description, :code, :item]

      change {Chironium.Health.Changes.CamelizeJsonKeys, attribute: :item}
      validate ValidItemTree
    end
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    # A definition has no patient subject; it is shared across the tenant's practitioners.
    policy action_type(:read) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end
  end

  attributes do
    attribute :status, Chironium.Datatypes.PublicationStatus do
      description "The lifecycle status: only `active` questionnaires should be filled."
      public? true
      allow_nil? false
      default :draft
    end

    attribute :title, :string do
      description "Human-friendly name for the questionnaire."
      public? true
    end

    attribute :name, :string do
      description "Computer-friendly name for the questionnaire."
      public? true
    end

    attribute :url, :string do
      description "Canonical identifier for this questionnaire."
      public? true
    end

    attribute :version, :string do
      description "Business version of the questionnaire."
      public? true
    end

    attribute :date, :datetime do
      description "Date the questionnaire was last changed."
      public? true
      default &DateTime.utc_now/0
    end

    attribute :description, :string do
      description "Natural-language description of the questionnaire."
      public? true
    end

    attribute :code, {:array, Chironium.Datatypes.Coding} do
      description "Concept(s) that represent the overall questionnaire."
      public? true
    end

    attribute :item, {:array, :map} do
      description "The FHIR item tree (groups and questions) as JSON. See moduledoc."
      public? true
    end
  end
end
