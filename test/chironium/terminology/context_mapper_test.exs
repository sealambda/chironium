defmodule Chironium.Terminology.ContextMapperTest do
  use Chironium.DataCase, async: true

  import Chironium.Generator

  alias Chironium.Terminology.CodeSystem
  alias Chironium.Terminology.Concept
  alias Chironium.Terminology.ContextMapper

  defp seed_concept(system, active) do
    code_system =
      Ash.Seed.seed!(CodeSystem, %{
        url: system,
        version: "v1",
        name: "Test",
        title: "Test",
        status: :active,
        content: :complete
      })

    Ash.Seed.seed!(Concept, %{code_system_id: code_system.id, code: "1", active: active})
  end

  test "lists only the contexts whose code system has active concepts" do
    assert ContextMapper.available() == []

    seed_concept("http://snomed.info/sct", false)
    assert ContextMapper.available() == []

    seed_concept("http://loinc.org", true)
    assert ContextMapper.available() == [:lab_result]
  end

  test "is a GraphQL query for staff" do
    seed_concept("http://loinc.org", true)
    staff = generate(user())

    assert {:ok, %{data: %{"availableConceptContexts" => ["LAB_RESULT"]}}} =
             Absinthe.run("{ availableConceptContexts }", ChironiumWeb.GraphqlSchema,
               context: %{actor: staff}
             )

    assert {:ok, %{errors: [_ | _]}} =
             Absinthe.run("{ availableConceptContexts }", ChironiumWeb.GraphqlSchema)
  end
end
