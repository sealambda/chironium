defmodule Mix.Tasks.Chironium.Seed.Organization do
  @moduledoc "Create a user and organization for seeding. Prints the tenant string for use with other seed tasks."
  @shortdoc "Seed a new organization"

  use Mix.Task

  alias Chironium.Seed
  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: [name: :string, slug: :string, invite: :string, role: :string]
      )

    Helpers.ensure_started!()
    {user, org, tenant} = Seed.Organization.seed(opts)

    Helpers.info("[Seed] Organization '#{org.name}' created.")
    Helpers.info("[Seed] Tenant: #{tenant}")
    Helpers.info("[Seed] User email: #{user.email}")

    invite_email = Keyword.get(opts, :invite)
    role = Helpers.parse_role(opts)
    invite = Seed.Organization.seed_invitation(org, user, invite_email, role)

    if invite_email do
      Helpers.info("[Seed] Invitation sent to #{invite.email} with role '#{invite.role}'.")
    else
      Helpers.info("[Seed] Invite code: #{invite.invite_code} (role: #{invite.role})")
    end
  end
end
