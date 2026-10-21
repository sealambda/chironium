defmodule Chironium.Health.Task.Calculations.OrganizationField do
  @moduledoc """
  A field of the organization that owns the task's tenant, named by the
  `:field` option.

  Loaded without authorization so a patient can see who is asking, while the
  Organization resource itself stays closed to them.
  """

  use Ash.Resource.Calculation

  alias Chironium.Accounts.Authorization
  alias Chironium.Accounts.Organization

  @impl true
  def calculate(tasks, opts, context) do
    value =
      with {:ok, organization_id} <- Authorization.organization_id_from_tenant(context.tenant),
           {:ok, organization} <- Ash.get(Organization, organization_id, authorize?: false) do
        Map.fetch!(organization, opts[:field])
      else
        _ -> nil
      end

    Enum.map(tasks, fn _task -> value end)
  end
end
