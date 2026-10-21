defmodule Chironium.Health.Checks.PatientSubjectVisibleToActor do
  @moduledoc """
  Filter check for resources that belong to a `Patient` through a named relationship.

  A practitioner sees records whose patient is reachable through their active
  care teams. Configure the relationship name via the `relationship:` option:

      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :subject}
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :patient}
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :for_patient}

  The `:for_patient` variant additionally requires the FK to be non-nil, so
  records without a linked patient are inaccessible to non-power-user actors.

  Power users (org owners / `power_user` role) bypass this check via a
  separate `bypass` policy on each resource.
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(opts) do
    rel = Keyword.get(opts, :relationship, :subject)
    "patient (via #{rel}) is in actor's active care teams"
  end

  @impl true
  def filter(%{__struct__: Chironium.Health.Practitioner} = practitioner, _authorizer, opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]
    rel = Keyword.get(opts, :relationship, :subject)

    care_team_filter =
      expr(
        status == :active and
          exists(participants, active == true and practitioner_id in ^practitioner_ids)
      )

    case rel do
      :subject ->
        expr(exists(subject.care_teams, ^care_team_filter))

      :patient ->
        expr(exists(patient.care_teams, ^care_team_filter))

      :for_patient ->
        expr(
          not is_nil(for_patient_id) and
            exists(for_patient.care_teams, ^care_team_filter)
        )
    end
  end

  # Non-practitioner actors that reach this check see nothing.
  def filter(_, _, _), do: false
end
