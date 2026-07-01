defmodule Chironium.Health.QuestionnaireResponse.Changes.RelateAuthorToActor do
  @moduledoc """
  Defaults the `author` to the acting Practitioner on create.

  In the current back-office flow a Practitioner fills the questionnaire on the
  patient's behalf, so the author is the actor. A future patient-self-fill channel
  will supply a different author; non-practitioner actors leave it unset, and an
  explicitly provided author is preserved.
  """

  use Ash.Resource.Change

  @impl Ash.Resource.Change
  def change(changeset, _opts, context) do
    with nil <- Ash.Changeset.get_attribute(changeset, :author_id),
         %Chironium.Health.Practitioner{id: practitioner_id} <- context.actor do
      Ash.Changeset.change_attribute(changeset, :author_id, practitioner_id)
    else
      _ -> changeset
    end
  end
end
