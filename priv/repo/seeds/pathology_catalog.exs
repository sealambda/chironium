# Pathology Catalog Seeds
#
# This file seeds the PathologyCatalog with standardized medical conditions.
# Run with: mix run priv/repo/seeds/pathology_catalog.exs
#
# IMPORTANT: Run pathology_categories.exs first to create the categories.
#
# Naming conventions:
# - Use medical terminology with common names in parentheses when helpful.
# - Group by category for easier maintenance.
# - ICD codes are ICD-10-CM where available.

alias Chironium.Health.PathologyCategory
alias Chironium.Health.PathologyCatalog

defmodule Seeds.PathologyCatalog do
  @moduledoc false

  def run do
    IO.puts("Seeding pathology catalog...")

    category_map = load_categories()

    if map_size(category_map) == 0 do
      IO.puts("✗ No categories found. Run pathology_categories.exs first.")
      exit(:shutdown)
    end

    seed_pathologies(category_map)

    IO.puts("\nPathology catalog seeding complete.")
  end

  defp load_categories do
    PathologyCategory
    |> Ash.read!()
    |> Enum.reduce(%{}, fn cat, acc -> Map.put(acc, cat.code, cat.id) end)
  end
    pathologies(category_map)
    |> Enum.each(fn attrs ->
      case Ash.create(PathologyCatalog, attrs, return_errors?: true) do
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
  end

  defp pathologies(category_map) do
    digestive(category_map) ++
      hormonal_gynecological(category_map) ++
      metabolic_hematological(category_map) ++
      immunological_autoimmune(category_map) ++
      neurological_psychological(category_map) ++
      musculoskeletal(category_map)
  end

  # =============================================================================
  # Digestive / Gastrointestinal
  # =============================================================================

  defp digestive(category_map) do
    category_id = Map.fetch!(category_map, "digestive")

    [
      %{
        name: "Irritable Bowel Syndrome with Diarrhea (IBS-D)",
        icd_code: "K58.0",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Functional bowel disorder characterized by chronic abdominal pain and diarrhea without structural abnormalities."
      },
      %{
        name: "Irritable Bowel Syndrome with Constipation (IBS-C)",
        icd_code: "K58.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Functional bowel disorder characterized by chronic abdominal pain and constipation without structural abnormalities."
      },
      %{
        name: "Irritable Bowel Syndrome, Mixed Type (IBS-M)",
        icd_code: "K58.2",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Functional bowel disorder with alternating patterns of diarrhea and constipation."
      },
      %{
        name: "Small Intestinal Bacterial Overgrowth (SIBO)",
        icd_code: "K63.89",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Excessive bacteria in the small intestine causing bloating, diarrhea, and malabsorption."
      },
      %{
        name: "Intestinal Dysbiosis",
        icd_code: "K63.89",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Imbalance of intestinal microbiota associated with digestive symptoms and systemic effects."
      },
      %{
        name: "Intestinal Candidiasis (Fungal Overgrowth)",
        icd_code: "B37.89",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Overgrowth of Candida species in the gastrointestinal tract causing digestive symptoms."
      },
      %{
        name: "Chronic Gastritis",
        icd_code: "K29.5",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Chronic inflammation of the stomach lining causing pain, nausea, and digestive discomfort."
      },
      %{
        name: "Functional Dyspepsia",
        icd_code: "K30",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Chronic indigestion without identifiable structural cause, including epigastric pain and early satiety."
      },
      %{
        name: "Gastroesophageal Reflux Disease (GERD)",
        icd_code: "K21.0",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Chronic condition where stomach acid frequently flows back into the esophagus causing heartburn and regurgitation."
      },
      %{
        name: "Hiatal Hernia",
        icd_code: "K44.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Protrusion of the upper stomach through the diaphragm into the thoracic cavity."
      },
      %{
        name: "Steatorrhea (Fat Malabsorption)",
        icd_code: "K90.49",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Presence of excess fat in stool indicating fat malabsorption from pancreatic or intestinal dysfunction."
      },
      %{
        name: "Hypochlorhydria (Low Stomach Acid)",
        icd_code: "K31.89",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Insufficient hydrochloric acid production in the stomach affecting digestion and nutrient absorption."
      },
      %{
        name: "Intestinal Malabsorption Syndrome",
        icd_code: "K90.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Impaired absorption of nutrients from the intestinal tract due to various underlying conditions."
      },
      %{
        name: "Helicobacter Pylori Infection (Active)",
        icd_code: "B96.81",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Active bacterial infection of the stomach lining associated with gastritis and peptic ulcers."
      },
      %{
        name: "Helicobacter Pylori Infection (History of)",
        icd_code: "Z86.19",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Previous H. pylori infection, treated, with potential for recurrence or post-infectious sequelae."
      },
      %{
        name: "Bilateral Non-Obstructive Nephrolithiasis",
        icd_code: "N20.0",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Kidney stones present in both kidneys without causing urinary obstruction."
      }
    ]
  end

  # =============================================================================
  # Hormonal & Gynecological
  # =============================================================================

  defp hormonal_gynecological(category_map) do
    category_id = Map.fetch!(category_map, "hormonal_gynecological")

    [
      %{
        name: "Polycystic Ovary Syndrome (PCOS), Classic Phenotype",
        icd_code: "E28.2",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Classic PCOS with hyperandrogenism, ovulatory dysfunction, and polycystic ovarian morphology."
      },
      %{
        name: "Polycystic Ovary Syndrome (PCOS), Atypical Phenotype",
        icd_code: "E28.2",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Non-classic PCOS variants with partial criteria fulfillment or lean phenotype."
      },
      %{
        name: "Hypothalamic Amenorrhea",
        icd_code: "N91.1",
        gender_scope: :FEMALE_ONLY,
        is_chronic: false,
        category_id: category_id,
        description: "Absence of menstruation due to hypothalamic dysfunction, often related to stress, weight loss, or excessive exercise."
      },
      %{
        name: "Post-Contraceptive Amenorrhea",
        icd_code: "N91.2",
        gender_scope: :FEMALE_ONLY,
        is_chronic: false,
        category_id: category_id,
        description: "Absence of menstruation following discontinuation of hormonal contraceptives."
      },
      %{
        name: "Insulin Resistance",
        icd_code: "E88.81",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Decreased cellular response to insulin, often preceding metabolic syndrome and type 2 diabetes."
      },
      %{
        name: "Reactive Hypoglycemia",
        icd_code: "E16.1",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Postprandial hypoglycemia occurring within hours after eating, often related to insulin dysregulation."
      },
      %{
        name: "Hashimoto's Thyroiditis",
        icd_code: "E06.3",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Autoimmune thyroid disease causing gradual thyroid destruction and hypothyroidism."
      },
      %{
        name: "Subclinical Hypothyroidism",
        icd_code: "E02",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Elevated TSH with normal free T4 levels, often with subtle symptoms."
      },
      %{
        name: "Uterine Leiomyoma (Fibroids)",
        icd_code: "D25.9",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Benign smooth muscle tumors of the uterus, common in reproductive-age women."
      },
      %{
        name: "Endometriosis",
        icd_code: "N80.9",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Presence of endometrial-like tissue outside the uterus causing pain and potential fertility issues."
      },
      %{
        name: "Perimenopause",
        icd_code: "N95.1",
        gender_scope: :FEMALE_ONLY,
        is_chronic: false,
        category_id: category_id,
        description: "Transitional phase before menopause with irregular cycles and hormonal fluctuations."
      },
      %{
        name: "Cyclic Hormonal Imbalance",
        icd_code: "E28.9",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Recurring hormonal dysregulation affecting menstrual cycle regularity and associated symptoms."
      },
      %{
        name: "Postpartum Diastasis Recti",
        icd_code: "M62.08",
        gender_scope: :FEMALE_ONLY,
        is_chronic: false,
        category_id: category_id,
        description: "Separation of abdominal rectus muscles following pregnancy."
      },
      %{
        name: "Pelvic Floor Dysfunction (Postpartum)",
        icd_code: "N81.89",
        gender_scope: :FEMALE_ONLY,
        is_chronic: false,
        category_id: category_id,
        description: "Weakness or dysfunction of pelvic floor muscles following childbirth."
      }
    ]
  end

  # =============================================================================
  # Metabolic & Hematological
  # =============================================================================

  defp metabolic_hematological(category_map) do
    category_id = Map.fetch!(category_map, "metabolic_hematological")

    [
      %{
        name: "Type 1 Diabetes Mellitus",
        icd_code: "E10.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Autoimmune destruction of pancreatic beta cells requiring lifelong insulin therapy."
      },
      %{
        name: "Type 2 Diabetes Mellitus",
        icd_code: "E11.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Metabolic disorder with insulin resistance and progressive beta cell dysfunction."
      },
      %{
        name: "Mixed Dyslipidemia",
        icd_code: "E78.2",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Elevated total cholesterol, LDL cholesterol, and/or triglycerides with low HDL."
      },
      %{
        name: "Hypercholesterolemia",
        icd_code: "E78.0",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Elevated blood cholesterol levels, primarily LDL cholesterol."
      },
      %{
        name: "Iron Deficiency Anemia",
        icd_code: "D50.9",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Anemia caused by insufficient iron stores, affecting hemoglobin production."
      },
      %{
        name: "Low Ferritin (Without Anemia)",
        icd_code: "E61.1",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Depleted iron stores with normal hemoglobin, may cause fatigue and other symptoms."
      },
      %{
        name: "Beta Thalassemia Minor",
        icd_code: "D56.3",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Heterozygous thalassemia trait causing mild microcytic anemia."
      },
      %{
        name: "Vitamin D Deficiency",
        icd_code: "E55.9",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Insufficient vitamin D levels affecting bone health, immunity, and overall wellbeing."
      }
    ]
  end

  # =============================================================================
  # Immunological & Autoimmune
  # =============================================================================

  defp immunological_autoimmune(category_map) do
    category_id = Map.fetch!(category_map, "immunological_autoimmune")

    [
      %{
        name: "Immune Thrombocytopenic Purpura (ITP)",
        icd_code: "D69.3",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Autoimmune disorder causing low platelet count and increased bleeding risk."
      },
      %{
        name: "Guillain-Barré Syndrome (History of)",
        icd_code: "G61.0",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Previous acute inflammatory polyneuropathy with potential for residual effects or recurrence considerations."
      }
    ]
  end

  # =============================================================================
  # Neurological & Psychological
  # =============================================================================

  defp neurological_psychological(category_map) do
    category_id = Map.fetch!(category_map, "neurological_psychological")

    [
      %{
        name: "Generalized Anxiety Disorder",
        icd_code: "F41.1",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Persistent excessive anxiety and worry affecting daily functioning."
      },
      %{
        name: "Chronic Stress Syndrome",
        icd_code: "F43.8",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Prolonged stress response affecting physical and psychological health."
      },
      %{
        name: "Major Depressive Disorder (History of)",
        icd_code: "Z86.59",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Previous depressive episode, relevant for treatment planning and monitoring."
      },
      %{
        name: "Major Depressive Disorder (Active)",
        icd_code: "F32.9",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Current depressive episode requiring active treatment and monitoring."
      },
      %{
        name: "Anorexia Nervosa",
        icd_code: "F50.0",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Eating disorder characterized by restrictive eating, fear of weight gain, and distorted body image."
      },
      %{
        name: "Bulimia Nervosa",
        icd_code: "F50.2",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Eating disorder with binge eating episodes followed by compensatory behaviors."
      },
      %{
        name: "Binge Eating Disorder",
        icd_code: "F50.81",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Recurrent episodes of eating large quantities of food with loss of control, without compensatory behaviors."
      },
      %{
        name: "Other Specified Feeding or Eating Disorder (OSFED)",
        icd_code: "F50.89",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Eating disorder not meeting full criteria for other specific eating disorders."
      },
      %{
        name: "Chronic Insomnia",
        icd_code: "G47.00",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Persistent difficulty initiating or maintaining sleep affecting daytime functioning."
      },
      %{
        name: "Sleep-Wake Disorder, Unspecified",
        icd_code: "G47.9",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Disrupted sleep patterns not classified as specific sleep disorder."
      },
      %{
        name: "Menstrual Migraine",
        icd_code: "G43.829",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Migraine headaches occurring in relation to menstrual cycle hormonal changes."
      },
      %{
        name: "Migraine Without Aura",
        icd_code: "G43.009",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Recurrent moderate to severe headaches without preceding sensory disturbances."
      }
    ]
  end

  # =============================================================================
  # Musculoskeletal
  # =============================================================================

  defp musculoskeletal(category_map) do
    category_id = Map.fetch!(category_map, "musculoskeletal")

    [
      %{
        name: "Lumbar Disc Herniation",
        icd_code: "M51.16",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Herniation of intervertebral disc in the lumbar spine causing back pain and potential radiculopathy."
      },
      %{
        name: "Cervical Muscle Contracture",
        icd_code: "M62.40",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Sustained involuntary muscle contraction in the cervical region causing pain and limited mobility."
      },
      %{
        name: "Chronic Low Back Pain",
        icd_code: "M54.5",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Persistent lumbar pain lasting more than 12 weeks."
      },
      %{
        name: "Patellofemoral Chondromalacia",
        icd_code: "M22.40",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Softening and degeneration of cartilage on the underside of the kneecap."
      },
      %{
        name: "Knee Meniscal Injury",
        icd_code: "M23.20",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Tear or derangement of the knee meniscus affecting joint function."
      },
      %{
        name: "Knee Ligament Injury (History of)",
        icd_code: "Z87.39",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Previous knee ligament injury with potential for residual instability or reinjury considerations."
      },
      %{
        name: "Ankle Sprain (Recurrent)",
        icd_code: "M24.274",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Repeated ankle ligament injuries leading to chronic instability."
      },
      %{
        name: "Healed Fracture with Functional Limitation",
        icd_code: "Z87.81",
        gender_scope: :BOTH,
        is_chronic: false,
        category_id: category_id,
        description: "Previous bone fracture with residual functional considerations for physical activity."
      },
      %{
        name: "Lipedema",
        icd_code: "E88.2",
        gender_scope: :FEMALE_ONLY,
        is_chronic: true,
        category_id: category_id,
        description: "Chronic disorder of adipose tissue distribution affecting limbs, distinct from lymphedema or obesity."
      },
      %{
        name: "Chronic Edema (Non-Cardiac)",
        icd_code: "R60.9",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Persistent fluid retention not caused by cardiac dysfunction."
      },
      %{
        name: "Generalized Arthralgia",
        icd_code: "M25.50",
        gender_scope: :BOTH,
        is_chronic: true,
        category_id: category_id,
        description: "Widespread joint pain without confirmed inflammatory or rheumatological diagnosis."
      }
    ]
  end
end

Seeds.PathologyCatalog.run()
