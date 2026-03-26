defmodule Chironium.Health do
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain,
      AshPaperTrail.Domain
    ]

  admin do
    show? true

    show_resources [
      Chironium.Health.AllergyIntolerance,
      Chironium.Health.Condition,
      Chironium.Health.Goal,
      Chironium.Health.MedicationStatement,
      Chironium.Health.NutritionPlan,
      Chironium.Health.Observation,
      Chironium.Health.Patient,
      Chironium.Health.Practitioner,
      Chironium.Health.Task
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.Health.AllergyIntolerance
    resource Chironium.Health.Condition
    resource Chironium.Health.Goal
    resource Chironium.Health.MedicationStatement
    resource Chironium.Health.NutritionPlan
    resource Chironium.Health.Observation
    resource Chironium.Health.Patient
    resource Chironium.Health.Practitioner
    resource Chironium.Health.Task
  end
end
