defmodule ChironiumWeb.Schema.QuestionnaireTypes do
  @moduledoc """
  Absinthe input objects for the FHIR Questionnaire `item` tree and the
  QuestionnaireResponse answer tree.

  These let the recursive trees be sent as real, typed, nested objects rather than a
  serialized JSON scalar — Absinthe scalars cannot receive structured input at all
  (`parse` is never invoked for object/list values), so a self-referential input object
  is the only way to accept a nested tree. AshGraphql references these from the resources
  via `attribute_input_types`.

  Absinthe coerces each input object into a snake_case, atom-keyed map (`:link_id`,
  `:enable_when`, `:value_quantity`); `Chironium.Health.Changes.CamelizeJsonKeys`
  normalizes those keys to FHIR's camelCase string form before validation and storage.
  Coded values (item `type`, enableWhen `operator`, `enableBehavior`, `answerConstraint`)
  are plain strings carrying the FHIR codes directly, so no enum mapping is needed.

  Only *input* is typed here; output stays the structured `Json` scalar. Fields not
  declared below are dropped on input, so any new FHIR field the UI sends must be added.
  """
  use Absinthe.Schema.Notation

  @desc "A coding: a code within a system, with an optional display label."
  input_object :fhir_coding_input do
    field :system, non_null(:string)
    field :code, non_null(:string)
    field :display, :string
  end

  @desc "A measured quantity value (FHIR Quantity)."
  input_object :fhir_quantity_input do
    field :value, :float
    field :unit, :string
    field :system, :string
    field :code, :string
  end

  @desc "An allowed answer option for a `coding` question."
  input_object :questionnaire_answer_option_input do
    field :value_coding, :fhir_coding_input
    field :value_string, :string
    field :value_integer, :integer
    field :value_date, :string
  end

  @desc "A condition that shows an item only when a prior answer matches (FHIR enableWhen)."
  input_object :questionnaire_enable_when_input do
    field :question, non_null(:string)
    field :operator, non_null(:string)
    field :answer_boolean, :boolean
    field :answer_string, :string
    field :answer_integer, :integer
    field :answer_decimal, :float
    field :answer_date, :string
    field :answer_coding, :fhir_coding_input
  end

  @desc "A node in the FHIR Questionnaire item tree (a group or a question)."
  input_object :questionnaire_item_input do
    field :link_id, non_null(:string)
    field :type, non_null(:string)
    field :text, :string
    field :prefix, :string
    field :code, list_of(:fhir_coding_input)
    field :required, :boolean
    field :repeats, :boolean
    field :read_only, :boolean
    field :max_length, :integer
    field :answer_constraint, :string
    field :answer_option, list_of(:questionnaire_answer_option_input)
    field :enable_when, list_of(:questionnaire_enable_when_input)
    field :enable_behavior, :string
    field :unit, :fhir_coding_input
    field :item, list_of(:questionnaire_item_input)
  end

  @desc "A single answer value; exactly one `value[x]` is set (FHIR QuestionnaireResponse.answer)."
  input_object :questionnaire_answer_input do
    field :value_boolean, :boolean
    field :value_decimal, :float
    field :value_integer, :integer
    field :value_date, :string
    field :value_date_time, :string
    field :value_string, :string
    field :value_coding, :fhir_coding_input
    field :value_quantity, :fhir_quantity_input
  end

  @desc "A node in the QuestionnaireResponse answer tree."
  input_object :questionnaire_response_item_input do
    field :link_id, non_null(:string)
    field :text, :string
    field :answer, list_of(:questionnaire_answer_input)
    field :item, list_of(:questionnaire_response_item_input)
  end
end
