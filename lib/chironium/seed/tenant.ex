defmodule Chironium.Seed.Tenant do
  @moduledoc "Tenant-scoped Ash options and reads shared by the seed modules."

  def ash_opts(tenant) do
    [tenant: tenant, authorize?: false]
  end

  def fetch_patients!(tenant) do
    Chironium.Health.Patient
    |> Ash.stream!(ash_opts(tenant))
    |> Enum.to_list()
  end

  def fetch_practitioners!(tenant) do
    Chironium.Health.Practitioner
    |> Ash.stream!(ash_opts(tenant))
    |> Enum.to_list()
  end
end
