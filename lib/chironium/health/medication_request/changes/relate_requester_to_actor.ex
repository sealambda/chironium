defmodule Chironium.Health.MedicationRequest.Changes.RelateRequesterToActor do
  @moduledoc """
  Defaults the `requester` to the acting Practitioner on create.

  The requester is what distinguishes a medication prescribed in-app from one
  the patient already reported taking (a MedicationStatement). Non-practitioner
  actors (e.g. power users) leave it unset, and an explicitly provided requester
  is preserved.
  """

  use Ash.Resource.Change

  @impl Ash.Resource.Change
  def change(changeset, _opts, context) do
    with nil <- Ash.Changeset.get_attribute(changeset, :requester_id),
         %Chironium.Health.Practitioner{id: practitioner_id} <- context.actor do
      Ash.Changeset.change_attribute(changeset, :requester_id, practitioner_id)
    else
      _ -> changeset
    end
  end
end
