defmodule Chironium.Generator do
  use Ash.Generator

  def user(opts \\ []) do
    seed_generator(
      %Chironium.Accounts.User{
        email: sequence(:email, &"user-#{&1}@example.com")
      },
      overrides: opts
    )
  end

  def organization(opts \\ []) do
    name =
      opts[:name] ||
        sequence(:name, &"Test Organization #{&1}")

    slug =
      opts[:slug] ||
        sequence(:slug, &"test-organization-#{&1}")

    changeset_generator(
      Chironium.Accounts.Organization,
      :create,
      defaults: [name: name, slug: slug],
      actor: opts[:actor],
      overrides: opts
    )
  end
end
