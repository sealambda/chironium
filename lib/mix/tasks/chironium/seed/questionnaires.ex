defmodule Mix.Tasks.Chironium.Seed.Questionnaires do
  @moduledoc """
  Seed a "Weekly nutrition check-in" questionnaire and a few completed responses per patient.

  The responses use the exact LOINC + UCUM the anthropometry/cycle cards expect, so the
  extracted observations show up in those cards.
  """
  @shortdoc "Seed questionnaires and responses"

  use Mix.Task

  alias Mix.Tasks.Chironium.Seed.Helpers

  @loinc "http://loinc.org"
  @ucum "http://unitsofmeasure.org"

  # Flat list of free-text / options / measurement questions — exactly what the builder
  # can author (see `assets/src/features/questionnaires/model/measurements.ts`).
  @items [
    %{
      "linkId" => "weight",
      "type" => "quantity",
      "text" => "Body weight",
      "code" => [%{"system" => @loinc, "code" => "29463-7", "display" => "Body weight"}],
      "unit" => %{"system" => @ucum, "code" => "kg", "display" => "kg"}
    },
    %{
      "linkId" => "waist",
      "type" => "quantity",
      "text" => "Waist circumference",
      "code" => [%{"system" => @loinc, "code" => "8280-0", "display" => "Waist circumference"}],
      "unit" => %{"system" => @ucum, "code" => "cm", "display" => "cm"}
    },
    %{
      "linkId" => "period",
      "type" => "coding",
      "text" => "Did your period start this week?",
      "answerOption" => [%{"valueString" => "Yes"}, %{"valueString" => "No"}]
    },
    %{
      "linkId" => "period_start",
      "type" => "date",
      "text" => "Period start date",
      "code" => [%{"system" => @loinc, "code" => "8665-2", "display" => "Menstrual period start"}]
    },
    %{"linkId" => "comments", "type" => "text", "text" => "How are you feeling?"}
  ]

  @comments [
    "Feeling good and energetic this week.",
    "A bit tired, sleep was poor.",
    "Cravings were under control.",
    "Stuck to the plan most days."
  ]

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)
    practitioners = Helpers.fetch_practitioners!(tenant)

    questionnaire = create_questionnaire(tenant, Enum.random(practitioners))
    seed_responses(tenant, questionnaire, patients, practitioners)

    Helpers.info("[Seed] Weekly check-in seeded with responses for #{length(patients)} patients.")
  end

  defp create_questionnaire(tenant, actor) do
    Chironium.Health.Questionnaire
    |> Ash.Changeset.for_create(
      :create,
      %{
        title: "Weekly nutrition check-in",
        status: :active,
        version: "1.0",
        description: "Weekly progress: weight, waist, female health, and general comments.",
        item: @items
      },
      Keyword.put(Helpers.ash_opts(tenant), :actor, actor)
    )
    |> Ash.create!()
  end

  defp seed_responses(tenant, questionnaire, patients, practitioners) do
    Enum.each(patients, fn patient ->
      for week <- 1..Enum.random(1..3) do
        actor = Enum.random(practitioners)
        authored = DateTime.add(DateTime.utc_now(), -week * 7 * 86_400, :second)

        Chironium.Health.QuestionnaireResponse
        |> Ash.Changeset.for_create(
          :create,
          %{
            questionnaire_id: questionnaire.id,
            subject_id: patient.id,
            status: :completed,
            authored: authored,
            item: response_items(authored)
          },
          Keyword.put(Helpers.ash_opts(tenant), :actor, actor)
        )
        |> Ash.create!()
      end
    end)
  end

  defp response_items(authored) do
    weight = Float.round(60.0 + :rand.uniform() * 30.0, 1)
    waist = Float.round(70.0 + :rand.uniform() * 25.0, 1)
    period? = Enum.random([true, false])

    [
      %{
        "linkId" => "weight",
        "answer" => [
          %{
            "valueQuantity" => %{
              "value" => weight,
              "unit" => "kg",
              "system" => @ucum,
              "code" => "kg"
            }
          }
        ]
      },
      %{
        "linkId" => "waist",
        "answer" => [
          %{
            "valueQuantity" => %{
              "value" => waist,
              "unit" => "cm",
              "system" => @ucum,
              "code" => "cm"
            }
          }
        ]
      },
      %{
        "linkId" => "period",
        "answer" => [%{"valueString" => if(period?, do: "Yes", else: "No")}]
      },
      %{"linkId" => "comments", "answer" => [%{"valueString" => Enum.random(@comments)}]}
    ] ++
      if period? do
        [
          %{
            "linkId" => "period_start",
            "answer" => [%{"valueDate" => Date.to_iso8601(DateTime.to_date(authored))}]
          }
        ]
      else
        []
      end
  end
end
