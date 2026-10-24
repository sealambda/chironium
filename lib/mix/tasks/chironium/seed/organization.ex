defmodule Mix.Tasks.Chironium.Seed.Organization do
  @moduledoc "Create a user and organization for seeding. Prints the tenant string for use with other seed tasks."
  @shortdoc "Seed a new organization"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: [name: :string, slug: :string, invite: :string, role: :string]
      )

    Helpers.ensure_started!()
    {user, org, tenant} = seed(opts)

    Helpers.info("[Seed] Organization '#{org.name}' created.")
    Helpers.info("[Seed] Tenant: #{tenant}")
    Helpers.info("[Seed] User email: #{user.email}")

    invite_email = Keyword.get(opts, :invite)
    role = Helpers.parse_role(opts)
    invite = seed_invitation(org, user, invite_email, role)

    if invite_email do
      Helpers.info("[Seed] Invitation sent to #{invite.email} with role '#{invite.role}'.")
    else
      Helpers.info("[Seed] Invite code: #{invite.invite_code} (role: #{invite.role})")
    end
  end

  @doc """
  Create an organization, owned by `user:` or by a new seed user. `authorize?:`
  (default `true`) runs the create action's policies. Returns `{user, org, tenant}`.
  """
  def seed(opts \\ []) do
    run_id = System.unique_integer([:positive])

    user =
      Keyword.get_lazy(opts, :user, fn ->
        Ash.Seed.seed!(%Chironium.Accounts.User{email: "seed-#{run_id}@example.com"})
      end)

    name = Keyword.get(opts, :name, "Seed Org #{run_id}")
    slug = Keyword.get(opts, :slug, "seed-org-#{run_id}")
    authorize? = Keyword.get(opts, :authorize?, true)

    org = generate(organization(actor: user, authorize?: authorize?, name: name, slug: slug))
    tenant = "org_#{org.id}"

    {user, org, tenant}
  end

  @doc "Create an invitation for the organization. Uses the given email or generates one."
  def seed_invitation(org, user, email \\ nil, role \\ :member) do
    overrides =
      [organization_id: org.id, invited_by_id: user.id, role: role]
      |> then(fn opts -> if email, do: Keyword.put(opts, :email, email), else: opts end)

    generate(invitation(overrides))
  end
end
