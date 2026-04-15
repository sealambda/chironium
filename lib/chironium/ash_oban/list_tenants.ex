defmodule Chironium.AshOban.ListTenants do
  @moduledoc """
  Provides the list of tenants for AshOban triggers to iterate over.
  """

  @behaviour AshOban.ListTenants

  @impl true
  def list_tenants(_opts) do
    Chironium.Repo.all_tenants()
  end
end
