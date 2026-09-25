defmodule Chironium.Health.PatientPrincipalResolver do
  @moduledoc """
  Resolves patient principals into `%Patient{}` actors.

  Two credentials lead here:

  - a `GuestAccess` link session, which is scoped to the one task it was
    issued for (`scope: %{task_ids: [task_id]}`);
  - a `:patient` principal grant on a `User` (future persistent accounts),
    which sees all of the patient's own tasks (`scope: nil`).

  Policies are written against the `%Patient{}` and its scope, never against
  the credential.
  """

  @behaviour Chironium.Accounts.PrincipalResolver

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.Patient

  @impl true
  def resolve(principal_id, _all_ids, user, tenant) do
    with {:ok, patient} <- load(principal_id, tenant) do
      {:ok,
       patient
       |> Ash.Resource.put_metadata(:user, user)
       |> Ash.Resource.put_metadata(:scope, nil)}
    end
  end

  @doc "Resolves the patient a guest link session acts as."
  def resolve_guest(%GuestAccess{principal_type: :patient} = guest_access) do
    with {:ok, patient} <- load(guest_access.principal_id, GuestAccess.tenant(guest_access)) do
      {:ok,
       patient
       |> Ash.Resource.put_metadata(:guest_access, guest_access)
       |> Ash.Resource.put_metadata(:scope, %{task_ids: [guest_access.task_id]})}
    end
  end

  def resolve_guest(_guest_access), do: :error

  defp load(patient_id, tenant) do
    case Ash.get(Patient, patient_id, tenant: tenant, authorize?: false) do
      {:ok, %Patient{} = patient} -> {:ok, patient}
      _ -> :error
    end
  end
end
