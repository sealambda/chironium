# Pathology Category Seeds
#
# This file seeds the PathologyCategory reference table.
# Run with: mix run priv/repo/seeds/pathology_categories.exs
#
# Categories group pathologies by medical specialty for UI organization.

alias Chironium.Health.PathologyCategory

defmodule Seeds.PathologyCategories do
  @moduledoc false

  def run do
    IO.puts("Seeding pathology categories...")

    categories()
    |> Enum.each(fn attrs ->
      case Ash.create(PathologyCategory, attrs, return_errors?: true) do
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

    IO.puts("\nPathology categories seeding complete.")
  end

  defp categories do
    [
      %{
        code: "digestive",
        name: "Digestive",
        description: "Gastrointestinal conditions (IBS, SIBO, GERD, gastritis, malabsorption, etc.)",
        display_order: 1
      },
      %{
        code: "hormonal_gynecological",
        name: "Hormonal & Gynecological",
        description: "Endocrine and reproductive conditions (PCOS, endometriosis, thyroid disorders, etc.)",
        display_order: 2
      },
      %{
        code: "metabolic_hematological",
        name: "Metabolic & Hematological",
        description: "Metabolic and blood disorders (diabetes, dyslipidemia, anemia, etc.)",
        display_order: 3
      },
      %{
        code: "immunological_autoimmune",
        name: "Immunological & Autoimmune",
        description: "Immune system disorders (autoimmune conditions, allergies, etc.)",
        display_order: 4
      },
      %{
        code: "neurological_psychological",
        name: "Neurological & Psychological",
        description: "Neurological and mental health conditions (anxiety, depression, migraines, eating disorders, etc.)",
        display_order: 5
      },
      %{
        code: "musculoskeletal",
        name: "Musculoskeletal",
        description: "Bone, joint, and muscle conditions (hernias, arthralgia, lipedema, etc.)",
        display_order: 6
      }
    ]
  end
end

Seeds.PathologyCategories.run()
