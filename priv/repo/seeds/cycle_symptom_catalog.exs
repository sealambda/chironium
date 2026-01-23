# Cycle Symptom Catalog Seeds
#
# This file seeds the CycleSymptomCatalog with menstrual cycle symptoms.
# Run with: mix run priv/repo/seeds/cycle_symptom_catalog.exs

alias Chironium.Health.CycleSymptomCatalog

defmodule Seeds.CycleSymptomCatalog do
  @moduledoc false

  def run do
    IO.puts("Seeding cycle symptom catalog...")

    symptoms()
    |> Enum.each(fn attrs ->
      case Ash.create(CycleSymptomCatalog, attrs, return_errors?: true) do
        {:ok, _record} ->
          IO.puts("✓ Created: #{attrs.name}")

        {:error, %Ash.Error.Invalid{errors: errors}} ->
          if Enum.any?(errors, &match?(%Ash.Error.Changes.InvalidChanges{message: "has already been taken"}, &1)) do
            IO.puts("○ Skipped (exists): #{attrs.name}")
          else
            IO.puts("✗ Error creating #{attrs.name}: #{inspect(errors)}")
          end

        {:error, error} ->
          IO.puts("✗ Error creating #{attrs.name}: #{inspect(error)}")
      end
    end)

    IO.puts("\nCycle symptom catalog seeding complete.")
  end

  defp symptoms do
    [
      # Pain & Discomfort
      %{name: "Cramps", description: "Uterine contractions causing lower abdominal pain."},
      %{name: "Lower Back Pain", description: "Pain in the lumbar region associated with menstruation."},
      %{name: "Breast Tenderness", description: "Soreness or sensitivity in breast tissue."},
      %{name: "Headache", description: "General head pain not classified as migraine."},
      %{name: "Migraine", description: "Severe headache often with sensitivity to light and nausea."},
      %{name: "Joint Pain", description: "Aching or stiffness in joints."},
      %{name: "Pelvic Pain", description: "Pain in the lower pelvic region."},

      # Digestive
      %{name: "Bloating", description: "Abdominal distension and feeling of fullness."},
      %{name: "Nausea", description: "Feeling of sickness with urge to vomit."},
      %{name: "Diarrhea", description: "Loose or watery stools."},
      %{name: "Constipation", description: "Difficulty passing stools or infrequent bowel movements."},
      %{name: "Food Cravings", description: "Strong desire for specific foods, often sweet or salty."},
      %{name: "Appetite Changes", description: "Increased or decreased appetite."},

      # Mood & Emotional
      %{name: "Mood Swings", description: "Rapid changes in emotional state."},
      %{name: "Irritability", description: "Easily annoyed or agitated."},
      %{name: "Anxiety", description: "Feelings of worry, nervousness, or unease."},
      %{name: "Depression", description: "Persistent feelings of sadness or low mood."},
      %{name: "Crying Spells", description: "Sudden episodes of crying."},
      %{name: "Difficulty Concentrating", description: "Trouble focusing or maintaining attention."},

      # Energy & Sleep
      %{name: "Fatigue", description: "Persistent tiredness or lack of energy."},
      %{name: "Insomnia", description: "Difficulty falling or staying asleep."},
      %{name: "Hypersomnia", description: "Excessive sleepiness or prolonged sleep."},
      %{name: "Low Energy", description: "General feeling of reduced vitality."},

      # Physical
      %{name: "Acne", description: "Skin breakouts, often on face, chest, or back."},
      %{name: "Hot Flashes", description: "Sudden feelings of warmth, often with sweating."},
      %{name: "Dizziness", description: "Feeling lightheaded or unsteady."},
      %{name: "Water Retention", description: "Fluid buildup causing puffiness in hands, feet, or face."},
      %{name: "Weight Fluctuation", description: "Temporary changes in body weight."},

      # Flow-Related
      %{name: "Heavy Flow", description: "Heavier than usual menstrual bleeding."},
      %{name: "Light Flow", description: "Lighter than usual menstrual bleeding."},
      %{name: "Spotting", description: "Light bleeding between periods."},
      %{name: "Clots", description: "Passing blood clots during menstruation."}
    ]
  end
end

Seeds.CycleSymptomCatalog.run()
