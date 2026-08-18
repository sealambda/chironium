defmodule Chironium.Health.QuestionnaireResponse do
  @moduledoc """
  A structured set of answers to a `Chironium.Health.Questionnaire`, recorded for a
  patient.

  In the current back-office flow a Practitioner fills the questionnaire on the patient's
  behalf and is captured as the `author`; a future patient-self-fill channel will supply a
  different author.

  The answer tree is stored as JSON (mirroring the questionnaire `item` tree) and is
  **self-describing**: each node keeps its `linkId`, the question `text` (re-stamped from
  the definition by `Changes.NormalizeAnswerTree`), and the `answer.value[x]`, so a stored
  response survives later edits to the questionnaire. Keys use FHIR's camelCase JSON form.

  https://hl7.org/fhir/R5/questionnaireresponse.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  alias Chironium.Health.QuestionnaireResponse.Changes.ExtractObservations
  alias Chironium.Health.QuestionnaireResponse.Changes.NormalizeAnswerTree
  alias Chironium.Health.QuestionnaireResponse.Changes.RelateAuthorToActor

  postgres do
    table "questionnaire_responses"
  end

  graphql do
    type :questionnaire_response

    # The answer tree mirrors the questionnaire item tree. Output stays the structured
    # `Json` scalar; input is a typed, recursive Absinthe input object (Absinthe scalars
    # cannot receive structured values). `CamelizeJsonKeys` normalizes the coerced
    # snake_case atom keys to FHIR camelCase before the answer tree is processed.
    attribute_types item: {:array, :json}
    attribute_input_types item: {:array, :questionnaire_response_item_input}

    queries do
      get :get_questionnaire_response, :read
      list :list_questionnaire_responses, :read
    end

    mutations do
      create :create_questionnaire_response, :create

      update :update_questionnaire_response, :update

      destroy :delete_questionnaire_response, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:questionnaire_response]}
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      primary? true
      accept [:questionnaire_id, :subject_id, :author_id, :status, :authored, :item]

      # Normalize the typed input object's snake_case keys before the tree is read.
      change {Chironium.Health.Changes.CamelizeJsonKeys, attribute: :item}
      change RelateAuthorToActor
      change NormalizeAnswerTree
      change ExtractObservations
    end

    update :update do
      primary? true
      # NormalizeAnswerTree loads the linked questionnaire, so the action is non-atomic.
      require_atomic? false
      accept [:status, :authored, :item]

      change {Chironium.Health.Changes.CamelizeJsonKeys, attribute: :item}
      change NormalizeAnswerTree
      change ExtractObservations
    end
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :subject}
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  attributes do
    attribute :status, Chironium.Health.QuestionnaireResponse.Status do
      description "The position of the response in its lifecycle."
      public? true
      allow_nil? false
      default :in_progress
    end

    attribute :authored, :datetime do
      description "When the answers were gathered."
      public? true
      default &DateTime.utc_now/0
    end

    attribute :item, {:array, :map} do
      description "The self-describing answer tree as JSON. See moduledoc."
      public? true
    end
  end

  relationships do
    belongs_to :questionnaire, Chironium.Health.Questionnaire do
      description "The questionnaire that was answered."
      public? true
      allow_nil? false
      # Deleting a questionnaire archives it while keeping its responses, so this must read
      # archived rows too — otherwise the relationship resolves to nil and every reader of
      # the kept response (the patient timeline) breaks on a non-nullable field.
      read_action :read_including_archived
    end

    belongs_to :subject, Chironium.Health.Patient do
      description "The patient the answers are about."
      public? true
      allow_nil? false
    end

    belongs_to :author, Chironium.Health.Practitioner do
      description "Who recorded the answers. Defaults to the acting Practitioner."
      public? true
    end
  end
end
