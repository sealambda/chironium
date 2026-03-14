defmodule Chironium.Datatypes.Coding.DisplayCalculationTest do
  use Chironium.DataCase, async: true

  alias Chironium.Datatypes.Coding.DisplayCalculation
  alias Chironium.Terminology.CodeSystem
  alias Chironium.Terminology.Concept
  alias Chironium.Terminology.Designation

  test "uses locale from Ash calculation context to resolve display" do
    unique = System.unique_integer([:positive])
    system = "http://example.org/codes/#{unique}"
    code = "code-#{unique}"

    code_system =
      Ash.Seed.seed!(CodeSystem, %{
        url: system,
        version: "v1",
        name: "Example Code System",
        title: "Example Code System",
        status: :active,
        content: :complete
      })

    concept =
      Ash.Seed.seed!(Concept, %{
        code_system_id: code_system.id,
        code: code,
        active: true
      })

    Ash.Seed.seed!(Designation, %{
      concept_id: concept.id,
      language: "en",
      use: "display",
      value: "Headache"
    })

    Ash.Seed.seed!(Designation, %{
      concept_id: concept.id,
      language: "es",
      use: "display",
      value: "Dolor de cabeza"
    })

    [spanish_display] =
      DisplayCalculation.calculate(
        [%{system: system, code: code, version: "v1"}],
        [],
        %Ash.Resource.Calculation.Context{arguments: %{locale: "es-ES"}}
      )

    [default_display] =
      DisplayCalculation.calculate(
        [%{system: system, code: code, version: "v1"}],
        [],
        %{}
      )

    assert spanish_display == "Dolor de cabeza"
    assert default_display == "Headache"
  end
end
