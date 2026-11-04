defmodule Mix.Tasks.Chironium.DeleteOrganization do
  @shortdoc "Permanently delete an organization and all of its data"
  @moduledoc """
  Permanently deletes an organization and all associated data from the database.

  ## Warning

  This operation is **irreversible**. It removes:

  - All tenant-scoped records (health data, CRM persons, subscriptions, grants, paper trail versions).
  - Public-schema invitations and membership rows for the organization.
  - The organization row itself.

  Shared `users` and auth records are never deleted — they may belong to other organizations.

  ## Usage

      mix chironium.delete_organization --org-id <uuid>
      mix chironium.delete_organization --org-id <uuid> --yes

  ## Options

  - `--org-id` — The UUID of the organization to delete (required).
  - `--yes` — Skip the interactive confirmation prompt.

  ## Example

      mix chironium.delete_organization --org-id 019e3f8f-9af1-7d84-9961-9d2b379487dd --yes
  """

  use Mix.Task

  alias Chironium.Accounts.OrganizationDeletion
  alias Mix.Tasks.Chironium.Seed.Helpers

  @switches [org_id: :string, yes: :boolean]

  @impl true
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: @switches)

    org_id =
      case Keyword.fetch(opts, :org_id) do
        {:ok, id} -> id
        :error -> Mix.raise("--org-id is required.")
      end

    Helpers.ensure_started!()

    tenant = "org_#{org_id}"

    unless Keyword.get(opts, :yes, false) do
      confirm!(org_id, tenant)
    end

    Helpers.info("[Delete] Deleting organization #{org_id} (tenant: #{tenant})…")

    case OrganizationDeletion.delete(org_id) do
      :ok ->
        Helpers.info("[Delete] Organization #{org_id} deleted.")

      {:error, :not_found} ->
        Mix.raise("Organization #{org_id} not found.")

      {:error, reason} ->
        Mix.raise("Deletion failed: #{inspect(reason)}")
    end
  end

  defp confirm!(org_id, tenant) do
    Mix.shell().info("""

    WARNING: This will permanently delete organization #{org_id}
    and ALL data in tenant schema "#{tenant}".

    This operation cannot be undone. Shared users will be preserved.
    """)

    unless Mix.shell().yes?("Proceed?") do
      Mix.raise("Aborted.")
    end
  end
end
