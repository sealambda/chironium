defmodule Chironium.Seed.All do
  @moduledoc """
  Fills an existing organization with practitioners, patients and their clinical data.

  Shared by `mix chironium.seed`, `Chironium.Release.seed/1` and `Chironium.Demo.start/0`.
  """

  alias Chironium.Seed.{
    Allergies,
    CareTeams,
    ClinicalNotes,
    Conditions,
    Goals,
    Medications,
    MenstrualCycles,
    NutritionPlans,
    Observations,
    Patients,
    Practitioners,
    Subscriptions,
    Tasks
  }

  @doc """
  Seeds `tenant`. Takes `patients:`, `practitioners:` and a `log:` function for
  progress messages. Returns `{practitioners, patients}`.
  """
  def seed(tenant, opts) do
    log = Keyword.fetch!(opts, :log)

    practitioners = Practitioners.seed(tenant, Keyword.fetch!(opts, :practitioners))
    log.("[Seed] #{length(practitioners)} practitioners created.")

    patients = Patients.seed(tenant, Keyword.fetch!(opts, :patients))
    log.("[Seed] #{length(patients)} patients created.")

    subscription_result = Subscriptions.seed(tenant, patients)

    log.(
      "[Seed] Subscriptions created: #{subscription_result.created} " <>
        "(expired: #{subscription_result.expired}, active: #{subscription_result.active})."
    )

    CareTeams.seed(tenant, patients, practitioners)
    log.("[Seed] Care teams created.")

    Observations.seed(tenant, patients, practitioners)
    Conditions.seed(tenant, patients, practitioners)
    Goals.seed(tenant, patients, practitioners)
    Medications.seed(tenant, patients, practitioners)
    Allergies.seed(tenant, patients, practitioners)
    NutritionPlans.seed(tenant, patients)
    Tasks.seed(tenant, patients, practitioners)
    MenstrualCycles.seed(tenant, patients, practitioners)
    ClinicalNotes.seed(tenant, patients, practitioners)
    log.("[Seed] Clinical data created.")

    {practitioners, patients}
  end
end
