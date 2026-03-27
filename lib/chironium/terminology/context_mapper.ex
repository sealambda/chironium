defmodule Chironium.Terminology.ContextMapper do
  @moduledoc """
  Maps a clinical context atom to its SNOMED/LOINC system URL and root ancestor code.

  The `parent_code` is `nil` for code systems (e.g. LOINC) where the hierarchy
  is not encoded in the closure table; in that case only the system URL filter
  is applied.
  """

  @type context ::
          :allergy_intolerance
          | :condition
          | :food
          | :lab_result
          | :medication
  @type mapping :: %{system: String.t(), parent_code: String.t() | nil}

  @contexts %{
    # TODO Support multiple parents -> https://hl7.org/fhir/R5/valueset-allergyintolerance-code.html
    allergy_intolerance: %{system: "http://snomed.info/sct", parent_code: "105590001"},
    condition: %{system: "http://snomed.info/sct", parent_code: "404684003"},
    food: %{system: "http://snomed.info/sct", parent_code: "255620007"},
    lab_result: %{system: "http://loinc.org", parent_code: nil},
    medication: %{system: "http://snomed.info/sct", parent_code: "763158003"}
  }

  @doc """
  Returns the system URL and optional root ancestor code for a given context.

  Returns `{:ok, mapping}` or `:error` if the context is not recognized.
  """
  @spec get(context()) :: {:ok, mapping()} | :error
  def get(context) when is_atom(context), do: Map.fetch(@contexts, context)
end
