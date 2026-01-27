defmodule Chironium.Health do
  @moduledoc """
  Health domain - Medical and health record management.

  This is an optional domain that provides health-related functionality:
  - HealthProfile: Biological data (sex, blood type) - separate from Person's gender
  - BiometricRecord: Physical measurements (weight, height, body measurements)
  - NutritionPlan: Dietary plans with macro targets
  - MenstrualCycle: Cycle tracking for female customers
  - CycleSymptomCatalog: Reference catalog of cycle symptoms
  - CycleSymptomRecord: Symptoms recorded for specific cycles
  - PathologyCategory: Reference catalog of pathology categories (digestive, hormonal, etc.)
  - PathologyCatalog: Reference catalog of medical conditions (ICD codes)
  - Diagnosis: Customer diagnoses linked to assignments

  All health records belong to an Assignment from the Services domain.
  """
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain
    ]

  admin do
    show? true
  end

  resources do
    resource Chironium.Health.HealthProfile
    resource Chironium.Health.BiometricRecord
    resource Chironium.Health.CycleSymptomCatalog
    resource Chironium.Health.CycleSymptomRecord
    resource Chironium.Health.NutritionPlan
    resource Chironium.Health.MenstrualCycle
    resource Chironium.Health.PathologyCategory
    resource Chironium.Health.PathologyCatalog
    resource Chironium.Health.Diagnosis
  end
end
