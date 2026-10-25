defmodule Mix.Tasks.Chironium.Seed.Subscriptions do
  @moduledoc "Seed monthly/yearly subscription plans and random subscriptions for patients."
  @shortdoc "Seed subscriptions"

  use Mix.Task

  alias Chironium.Seed
  alias Chironium.Seed.Tenant
  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Tenant.fetch_patients!(tenant)
    result = Seed.Subscriptions.seed(tenant, patients)

    Helpers.info(
      "[Seed] Subscriptions created: #{result.created} " <>
        "(expired: #{result.expired}, active: #{result.active})."
    )
  end
end
