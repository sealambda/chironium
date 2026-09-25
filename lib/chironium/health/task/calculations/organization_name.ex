defmodule Chironium.Health.Task.Calculations.OrganizationName do
  @moduledoc """
  The name of the organization that owns the task's tenant.

  Loaded without authorization so a patient can see who is asking, while the
  Organization resource itself stays closed to them.
  """

  use Ash.Resource.Calculation

  alias Chironium.Accounts.Authorization
  alias Chironium.Accounts.Organization

  @impl true
  def calculate(tasks, _opts, context) do
    name =
      with {:ok, organization_id} <- Authorization.organization_id_from_tenant(context.tenant),
           {:ok, organization} <- Ash.get(Organization, organization_id, authorize?: false) do
        organization.name
      else
        _ -> nil
      end

    Enum.map(tasks, fn _task -> name end)
  end
end
