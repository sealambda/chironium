defmodule Chironium.Health.MedicationRequestTest do
  @moduledoc """
  Covers the structured prescription detail on MedicationRequest — dosage
  instructions, dispense request, substitution, course of therapy — together
  with the embedded validations, the requester-defaulting change, and the
  create/update persistence contract the prescription UI relies on.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  alias Chironium.Health.MedicationRequest
  alias Chironium.Health.MedicationStatement

  @substitution_system "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution"

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{tenant: tenant, patient: create_patient(tenant)}
  end

  describe "dosage_instruction validations" do
    test "rejects a period without a period unit", %{tenant: tenant, patient: patient} do
      assert {:error, %Ash.Error.Invalid{}} =
               create(tenant, patient, %{dosage_instruction: [%{text: "x", period: 1}]})
    end

    test "rejects a non-positive frequency", %{tenant: tenant, patient: patient} do
      assert {:error, %Ash.Error.Invalid{}} =
               create(tenant, patient, %{dosage_instruction: [%{text: "x", frequency: 0}]})
    end

    test "rejects a non-positive period", %{tenant: tenant, patient: patient} do
      assert {:error, %Ash.Error.Invalid{}} =
               create(tenant, patient, %{
                 dosage_instruction: [%{text: "x", period: 0, period_unit: :d}]
               })
    end

    test "accepts a fully specified dosage", %{tenant: tenant, patient: patient} do
      assert {:ok, mr} =
               create(tenant, patient, %{
                 dosage_instruction: [
                   %{
                     text: "1 tab daily",
                     frequency: 1,
                     period: 1,
                     period_unit: :d,
                     dose_quantity: %{value: 1, unit: "tablet"}
                   }
                 ]
               })

      assert [%{frequency: 1, period_unit: :d, dose_quantity: %{unit: "tablet"}}] =
               mr.dosage_instruction
    end
  end

  describe "dispense_request validations" do
    test "rejects negative refills", %{tenant: tenant, patient: patient} do
      assert {:error, %Ash.Error.Invalid{}} =
               create(tenant, patient, %{dispense_request: %{number_of_repeats_allowed: -1}})
    end

    test "allows zero refills", %{tenant: tenant, patient: patient} do
      assert {:ok, mr} =
               create(tenant, patient, %{dispense_request: %{number_of_repeats_allowed: 0}})

      assert mr.dispense_request.number_of_repeats_allowed == 0
    end
  end

  describe "requester defaulting" do
    test "defaults requester to the acting practitioner", %{tenant: tenant, patient: patient} do
      practitioner = create_practitioner(tenant)

      {:ok, mr} =
        MedicationRequest
        |> Ash.Changeset.for_create(:create, %{subject_id: patient.id},
          actor: practitioner,
          tenant: tenant
        )
        |> Ash.create()

      assert mr.requester_id == practitioner.id
    end

    test "preserves an explicitly provided requester", %{tenant: tenant, patient: patient} do
      acting = create_practitioner(tenant)
      explicit = create_practitioner(tenant)

      {:ok, mr} =
        MedicationRequest
        |> Ash.Changeset.for_create(
          :create,
          %{subject_id: patient.id, requester_id: explicit.id},
          actor: acting,
          tenant: tenant
        )
        |> Ash.create()

      assert mr.requester_id == explicit.id
    end

    test "leaves requester unset when there is no practitioner actor", %{
      tenant: tenant,
      patient: patient
    } do
      {:ok, mr} = create(tenant, patient, %{})
      assert is_nil(mr.requester_id)
    end
  end

  describe "create/update persistence contract" do
    test "updating one field leaves untouched embedded data intact", %{
      tenant: tenant,
      patient: patient
    } do
      {:ok, mr} =
        create(tenant, patient, %{
          course_of_therapy_type: :continuous,
          dosage_instruction: [%{text: "1 tab daily", frequency: 1, period: 1, period_unit: :d}],
          dispense_request: %{
            number_of_repeats_allowed: 2,
            quantity: %{value: 30, unit: "tablet"}
          },
          substitution: %{
            allowed_codeable_concept: %{coding: [%{system: @substitution_system, code: "G"}]}
          }
        })

      {:ok, updated} =
        mr
        |> Ash.Changeset.for_update(:update, %{status: :completed},
          authorize?: false,
          tenant: tenant
        )
        |> Ash.update()

      assert updated.status == :completed
      assert updated.course_of_therapy_type == :continuous
      assert [%{frequency: 1, period_unit: :d}] = updated.dosage_instruction
      assert updated.dispense_request.quantity.value == Decimal.new(30)

      assert [%{system: @substitution_system, code: "G"}] =
               updated.substitution.allowed_codeable_concept.coding
    end

    test "providing a dosage array fully replaces the previous one", %{
      tenant: tenant,
      patient: patient
    } do
      {:ok, mr} =
        create(tenant, patient, %{
          dosage_instruction: [%{text: "old", frequency: 3, period: 1, period_unit: :d}]
        })

      {:ok, updated} =
        mr
        |> Ash.Changeset.for_update(:update, %{dosage_instruction: [%{text: "new"}]},
          authorize?: false,
          tenant: tenant
        )
        |> Ash.update()

      # Confirms the replace semantics the frontend merge compensates for.
      assert [%{text: "new", frequency: nil}] = updated.dosage_instruction
    end
  end

  describe "MedicationStatement dosage" do
    test "persists structured dosage on a statement", %{tenant: tenant, patient: patient} do
      {:ok, ms} =
        MedicationStatement
        |> Ash.Changeset.for_create(
          :create,
          %{subject_id: patient.id, dosage: [%{text: "as needed", as_needed: true}]},
          authorize?: false,
          tenant: tenant
        )
        |> Ash.create()

      assert [%{text: "as needed", as_needed: true}] = ms.dosage
    end
  end

  # ─── Helpers ──────────────────────────────────────────────────────────

  defp create(tenant, patient, attrs) do
    MedicationRequest
    |> Ash.Changeset.for_create(:create, Map.merge(%{subject_id: patient.id}, attrs),
      authorize?: false,
      tenant: tenant
    )
    |> Ash.create()
  end

  defp create_patient(tenant) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: tenant)
    |> Ash.create!()
  end

  defp create_practitioner(tenant) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(:create, %{name: [%{text: "Dr. Test"}]},
      authorize?: false,
      tenant: tenant
    )
    |> Ash.create!()
  end
end
