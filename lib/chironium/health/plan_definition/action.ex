defmodule Chironium.Health.PlanDefinition.Action do
  @moduledoc """
  An action or group of actions to be taken as part of the plan.

  https://hl7.org/fhir/R5/plandefinition-definitions.html#PlanDefinition.action
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :plan_definition_action
  end

  attributes do
    attribute :title, :string do
      description "User-visible title"
      public? true
    end

    attribute :description, :string do
      description "Brief description of the action"
      public? true
    end

    attribute :code, Chironium.Datatypes.CodeableConcept do
      description "Code representing the meaning of the action or sub-actions"
      public? true
    end

    attribute :timing_duration, Chironium.Datatypes.Duration do
      description "When the action should take place (as a duration)"
      public? true
    end

    attribute :definition_uri, :string do
      description "Reference to an ActivityDefinition, Questionnaire, or PlanDefinition by URI"
      public? true
    end
  end
end
