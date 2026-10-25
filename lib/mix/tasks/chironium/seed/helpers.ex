defmodule Mix.Tasks.Chironium.Seed.Helpers do
  @moduledoc false

  def ensure_started! do
    Mix.Task.run("app.start")
  end

  @doc "Parse `--tenant` from CLI args. Raises if missing."
  def parse_tenant!(args, extra_strict \\ []) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: Keyword.merge([tenant: :string, count: :integer], extra_strict)
      )

    case Keyword.fetch(opts, :tenant) do
      {:ok, tenant} -> {tenant, opts}
      :error -> Mix.raise("--tenant is required (e.g. --tenant org_<uuid>)")
    end
  end

  @valid_roles ~w(member power_user)

  @doc "Parse --role from CLI opts, defaulting to :power_user. Raises on invalid values."
  def parse_role(opts) do
    case Keyword.get(opts, :role) do
      nil ->
        :power_user

      role when role in @valid_roles ->
        String.to_atom(role)

      other ->
        Mix.raise("Invalid --role '#{other}'. Must be one of: #{Enum.join(@valid_roles, ", ")}")
    end
  end

  def info(msg), do: Mix.shell().info(msg)
end
