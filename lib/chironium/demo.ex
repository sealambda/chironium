defmodule Chironium.Demo do
  @moduledoc """
  Public demo mode, turned on with `DEMO_MODE=true`. See docs/public-demo.md.

  Settings, with these defaults:

      config :chironium, Chironium.Demo,
        max_demos: 200,
        seed: &Mix.Tasks.Chironium.Seed.All.seed/2
  """

  require Logger

  alias Chironium.Demo.Cleanup
  alias Chironium.Repo
  alias Mix.Tasks.Chironium.Seed

  @defaults [max_demos: 200, seed: &Seed.All.seed/2]

  # Serializes the cap check with the user insert, so concurrent starts can't pass the cap.
  @lock_key 0x44454D4F

  @email_domain "@demo.invalid"

  @doc "Whether this instance runs as a public demo."
  @spec enabled?() :: boolean()
  def enabled?, do: Application.get_env(:chironium, :demo_mode?, false)

  @doc "Reads a demo setting, falling back to its default."
  def config(key) do
    @defaults
    |> Keyword.merge(Application.get_env(:chironium, __MODULE__, []))
    |> Keyword.fetch!(key)
  end

  @doc "Whether `user` is a throwaway demo user."
  def demo_user?(user), do: user.email |> to_string() |> String.ends_with?(@email_domain)

  @doc """
  Creates a demo user who owns a seeded organization. Returns `{:ok, user}`,
  `{:error, :full}` when `max_demos` demos are live, or `{:error, reason}` after
  deleting whatever it created.
  """
  def start do
    # Base32 lowercase only uses [a-z2-7], so the token always fits the slug format.
    token = Base.encode32(:crypto.strong_rand_bytes(10), case: :lower, padding: false)
    slug = "demo-" <> token

    with {:ok, user} <- create_user("demo-#{token}#{@email_domain}") do
      try do
        {user, _org, tenant} =
          Seed.Organization.seed(user: user, name: "Demo Clinic", slug: slug, authorize?: false)

        config(:seed).(tenant, patients: 15, practitioners: 3, log: fn _ -> :ok end)
        {:ok, user}
      catch
        kind, reason ->
          message = Exception.format_banner(kind, reason, __STACKTRACE__)
          Logger.error("[Demo] Start failed: #{message}")
          delete_created(user, slug)
          {:error, message}
      end
    end
  end

  defp create_user(email) do
    Repo.transaction(fn ->
      Repo.query!("SELECT pg_advisory_xact_lock($1)", [@lock_key])

      %{rows: [[count]]} =
        Repo.query!("SELECT count(*) FROM users WHERE email LIKE $1", ["%" <> @email_domain])

      if count >= config(:max_demos) do
        Repo.rollback(:full)
      else
        Ash.Seed.seed!(%Chironium.Accounts.User{email: email, name: "Demo user"})
      end
    end)
  end

  # Looks the organization up by slug, since a raise inside seeding loses the record.
  defp delete_created(user, slug) do
    %{rows: rows} = Repo.query!("SELECT id FROM organizations WHERE slug = $1", [slug])
    Enum.each(rows, fn [id] -> Cleanup.delete_organization(Ecto.UUID.cast!(id)) end)
    Cleanup.delete_user(user.id)
  end
end
