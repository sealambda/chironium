defmodule Chironium.Health.Patient.Changes.AssignPractitionerCareTeam do
  @moduledoc """
  After a Practitioner actor creates a Patient, automatically creates an active
  CareTeam with the creating practitioner as a participant.

  Without this, a practitioner would not be able to see the patient they just
  created, because read access is scoped to active care teams the practitioner
  participates in.
  """

  use Ash.Resource.Change

  @impl Ash.Resource.Change
  def change(changeset, _opts, context) do
    case context.actor do
      %Chironium.Health.Practitioner{} ->
        Ash.Changeset.after_action(changeset, &assign_care_team/2)

      _ ->
        changeset
    end
  end

  defp assign_care_team(changeset, patient) do
    practitioner = changeset.context[:private][:actor]

    with {:ok, care_team} <- create_care_team(practitioner, patient, changeset.tenant),
         {:ok, _} <- create_participant(practitioner, care_team, changeset.tenant) do
      {:ok, patient}
    end
  end

  defp create_care_team(practitioner, patient, tenant) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: :active, subject_patient_id: patient.id},
      actor: practitioner,
      tenant: tenant,
      authorize?: false
    )
    |> Ash.create()
  end

  defp create_participant(practitioner, care_team, tenant) do
    Chironium.Health.CareTeamParticipant
    |> Ash.Changeset.for_create(
      :create,
      %{care_team_id: care_team.id, practitioner_id: practitioner.id, active: true},
      actor: practitioner,
      tenant: tenant,
      authorize?: false
    )
    |> Ash.create()
  end
end
