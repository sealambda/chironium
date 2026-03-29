defmodule Chironium.Terminology.ServiceTest do
  use Chironium.DataCase, async: true

  alias Chironium.Terminology.CodeSystem
  alias Chironium.Terminology.Concept
  alias Chironium.Terminology.Designation
  alias Chironium.Terminology.Service

  defp seed_code_system(system) do
    Ash.Seed.seed!(CodeSystem, %{
      url: system,
      version: "v1",
      name: "Test Code System",
      title: "Test Code System",
      status: :active,
      content: :complete
    })
  end

  defp seed_concept(code_system_id, code) do
    Ash.Seed.seed!(Concept, %{code_system_id: code_system_id, code: code, active: true})
  end

  describe "resolve_display/4" do
    test "prefers display over synonym for an exact locale match" do
      unique = System.unique_integer([:positive])
      system = "http://example.org/codes/#{unique}"
      code = "code-#{unique}"

      code_system = seed_code_system(system)
      concept = seed_concept(code_system.id, code)

      # Seed synonym before display to verify DB insertion order doesn't influence the result.
      Ash.Seed.seed!(Designation, %{
        concept_id: concept.id,
        language: "en",
        use: "synonym",
        value: "Headache (synonym)"
      })

      Ash.Seed.seed!(Designation, %{
        concept_id: concept.id,
        language: "en",
        use: "display",
        value: "Headache"
      })

      assert {:ok, "Headache"} = Service.resolve_display(system, code, "v1", "en")
    end

    test "prefers display over synonym when matching via locale root (region fallback)" do
      unique = System.unique_integer([:positive])
      system = "http://example.org/codes/#{unique}"
      code = "code-#{unique}"

      code_system = seed_code_system(system)
      concept = seed_concept(code_system.id, code)

      Ash.Seed.seed!(Designation, %{
        concept_id: concept.id,
        language: "es",
        use: "synonym",
        value: "Dolor de cabeza (sinónimo)"
      })

      Ash.Seed.seed!(Designation, %{
        concept_id: concept.id,
        language: "es",
        use: "display",
        value: "Dolor de cabeza"
      })

      # "es-ES" should fall back to the "es" root and still pick display over synonym.
      assert {:ok, "Dolor de cabeza"} = Service.resolve_display(system, code, "v1", "es-ES")
    end
  end
end
