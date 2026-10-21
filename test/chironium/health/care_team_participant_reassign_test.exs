defmodule Chironium.Health.CareTeamParticipantReassignTest do
  @moduledoc """
  Tests that destroying (archiving) a CareTeamParticipant and re-creating one
  with the same care_team_id + practitioner_id succeeds.

  Before the fix the unconditional unique index on
  [care_team_id, practitioner_id] rejected the insert because the archived
  (soft-deleted) row still occupied that slot.
  """

  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # -- Helpers ----------------------------------------------------------------

  defp create_practitioner(ctx, name \\ "Dr. Test") do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: name}]},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_care_team(ctx, patient) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: :active, subject_patient_id: patient.id},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_participant(ctx, care_team, practitioner) do
    Chironium.Health.CareTeamParticipant
    |> Ash.Changeset.for_create(
      :create,
      %{care_team_id: care_team.id, practitioner_id: practitioner.id, active: true},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp destroy_participant(ctx, participant) do
    participant
    |> Ash.Changeset.for_destroy(:destroy, %{},
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.destroy!()
  end

  # -- Tests ------------------------------------------------------------------

  describe "reassigning a practitioner to the same care team" do
    test "succeeds after the previous participation was destroyed (archived)", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient)

      # First assignment.
      participant = create_participant(ctx, care_team, practitioner)

      # Destroy (soft-delete via AshArchival).
      destroy_participant(ctx, participant)

      # Re-create with the same care_team + practitioner — must not raise.
      new_participant = create_participant(ctx, care_team, practitioner)
      assert new_participant.care_team_id == care_team.id
      assert new_participant.practitioner_id == practitioner.id
      assert new_participant.id != participant.id
    end

    test "multiple archive-and-reassign cycles work", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient)

      for _i <- 1..3 do
        p = create_participant(ctx, care_team, practitioner)
        destroy_participant(ctx, p)
      end

      # Final re-creation still succeeds.
      final = create_participant(ctx, care_team, practitioner)
      assert final.care_team_id == care_team.id
      assert final.practitioner_id == practitioner.id
    end

    test "uniqueness is still enforced for non-archived participants", ctx do
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient)

      _existing = create_participant(ctx, care_team, practitioner)

      # Creating a duplicate without destroying first should fail.
      assert {:error, %Ash.Error.Invalid{}} =
               Chironium.Health.CareTeamParticipant
               |> Ash.Changeset.for_create(
                 :create,
                 %{care_team_id: care_team.id, practitioner_id: practitioner.id, active: true},
                 actor: ctx.owner,
                 tenant: ctx.tenant,
                 authorize?: false
               )
               |> Ash.create()
    end

    test "different practitioners can join the same care team", ctx do
      practitioner_a = create_practitioner(ctx, "Dr. A")
      practitioner_b = create_practitioner(ctx, "Dr. B")
      patient = create_patient(ctx)
      care_team = create_care_team(ctx, patient)

      pa = create_participant(ctx, care_team, practitioner_a)
      pb = create_participant(ctx, care_team, practitioner_b)

      assert pa.practitioner_id == practitioner_a.id
      assert pb.practitioner_id == practitioner_b.id
    end
  end
end
