defmodule Chironium.Seed.Organization do
  @moduledoc "Creates a user, an organization and its invitation for seeding."

  import Chironium.Generator

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
