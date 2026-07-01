defmodule Chironium.Health.Questionnaire.ItemType do
  @moduledoc """
  The R5 `QuestionnaireItemType` value set, modeled as a plain constant because the
  `Questionnaire.item` tree is stored as JSON (see `Chironium.Health.Questionnaire`)
  rather than as typed attributes.

  https://hl7.org/fhir/R5/valueset-item-type.html
  """

  # Full R5 value set. The builder/fill UI surfaces a pragmatic subset
  # (group, display, boolean, decimal, integer, date, dateTime, string, text,
  # coding, quantity); the rest are accepted but not authored yet.
  @all ~w(group display boolean decimal integer date dateTime time string text url coding attachment reference quantity)

  @doc "All valid item types."
  def all, do: @all

  @doc "Whether `type` is a recognized item type."
  def valid?(type), do: type in @all

  @doc "Whether the item only structures other items and carries no answer of its own."
  def structural?(type), do: type in ~w(group display)

  @doc """
  The `answer.value[x]` keys accepted for a given question type. The first entry is the
  canonical key; alternates accommodate the R5 `answerConstraint` escape hatches
  (e.g. a `coding` question with `optionsOrString` may carry a free-text `valueString`).
  Returns `[]` for structural/unanswerable types.
  """
  def answer_keys("boolean"), do: ["valueBoolean"]
  def answer_keys("decimal"), do: ["valueDecimal", "valueQuantity"]
  def answer_keys("integer"), do: ["valueInteger"]
  def answer_keys("date"), do: ["valueDate"]
  def answer_keys("dateTime"), do: ["valueDateTime"]
  def answer_keys("time"), do: ["valueTime", "valueString"]
  def answer_keys("string"), do: ["valueString"]
  def answer_keys("text"), do: ["valueString"]
  def answer_keys("url"), do: ["valueUri", "valueString"]
  def answer_keys("coding"), do: ["valueCoding", "valueString"]
  def answer_keys("quantity"), do: ["valueQuantity"]
  def answer_keys(_type), do: []
end
