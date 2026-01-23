defmodule Chironium.MixProject do
  use Mix.Project

  def project do
    [
      app: :chironium,
      version: "0.1.0",
      elixir: "~> 1.15",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      compilers: [:phoenix_live_view] ++ Mix.compilers(),
      listeners: [Phoenix.CodeReloader],
      consolidate_protocols: Mix.env() != :dev,
      dialyzer: dialyzer()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Chironium.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  def cli do
    [
      preferred_envs: [precommit: :test]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:ash_rate_limiter, "~> 0.2"},
      {:ex_money_sql, "~> 1.0"},
      {:ex_cldr, "~> 2.0"},
      {:ex_cldr_calendars, "~> 2.4"},
      {:ex_cldr_dates_times, "~> 2.25"},
      {:ex_cldr_lists, "~> 2.11"},
      {:ex_cldr_person_names, "~> 1.1"},
      {:ex_cldr_territories, "~> 2.11"},
      {:ex_cldr_units, "~> 3.20"},
      {:picosat_elixir, "~> 0.2"},
      {:absinthe_phoenix, "~> 2.0"},
      {:sourceror, "~> 1.8", only: [:dev, :test]},
      {:oban, "~> 2.0"},
      {:open_api_spex, "~> 3.0"},
      {:ash_money, "~> 0.2"},
      {:ash_typescript, "~> 0.12"},
      {:usage_rules, "~> 0.1", only: [:dev]},
      {:ash_cloak, "~> 0.1"},
      {:cloak, "~> 1.0"},
      {:ash_paper_trail, "~> 0.5"},
      {:tidewave, "~> 0.5", only: [:dev]},
      {:ash_archival, "~> 2.0"},
      {:ash_events, "~> 0.5"},
      {:ash_state_machine, "~> 0.2"},
      {:oban_web, "~> 2.0"},
      {:ash_oban, "~> 0.7"},
      {:ash_admin, "~> 0.13"},
      {:ash_authentication_phoenix, "~> 2.0"},
      {:ash_authentication, "~> 4.0"},
      {:ash_postgres, "~> 2.0"},
      {:ash_json_api, "~> 1.0"},
      {:ash_graphql, "~> 1.0"},
      {:ash_phoenix, "~> 2.0"},
      {:ash, "~> 3.0"},
      {:igniter, "~> 0.6", only: [:dev, :test]},
      {:phoenix, "~> 1.8.3"},
      {:phoenix_ecto, "~> 4.5"},
      {:dotenvy, "~> 0.9"},
      {:ecto_sql, "~> 3.13"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 1.1.0"},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.8.3"},
      {:esbuild, "~> 0.10", runtime: Mix.env() == :dev},
      {:tailwind, "~> 0.3", runtime: Mix.env() == :dev},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.2.0",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.16"},
      {:req, "~> 0.5"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.2.0"},
      {:bandit, "~> 1.5"},
      {:ecto_psql_extras, "~> 0.8"},
      # Static analysis tools.
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false},
      {:sobelow, "~> 0.13", only: [:dev, :test], runtime: false}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "ash.setup", "assets.setup", "assets.build", "run priv/repo/seeds.exs"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ash.setup --quiet", "test"],
      "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      "assets.build": ["compile", "tailwind chironium", "esbuild chironium"],
      "assets.deploy": [
        "tailwind chironium --minify",
        "esbuild chironium --minify",
        "phx.digest"
      ],
      # Clean rebuild: Safe for daily use, preserves VCS-tracked migrations.
      rebuild: [
        "cmd rm -rf _build deps client/src/lib/ash.ts",
        "deps.get",
        "compile",
        "ecto.drop",
        "ecto.create",
        "ecto.migrate",
        "ash.codegen"
      ],
      # Nuclear rebuild: Regenerates all migrations. Pre-production only!
      "rebuild.nuke": [
        "cmd rm -rf _build deps client/src/lib/ash.ts priv/repo/migrations/* priv/resource_snapshots/*",
        "deps.get",
        "compile",
        "ecto.drop",
        "ecto.create",
        "ash.codegen initial",
        "cmd mix oban.install",
        "ecto.migrate"
      ],
      # Quality & linting aliases.
      "format.check": ["format --check-formatted"],
      lint: ["format --check-formatted", "credo --strict", "sobelow --config"],
      "lint.fix": ["format"],
      quality: [
        "compile --warnings-as-errors",
        "format --check-formatted",
        "credo --strict",
        "sobelow --config",
        "dialyzer"
      ],
      precommit: [
        "compile --warnings-as-errors",
        "deps.unlock --unused",
        "format --check-formatted",
        "credo --strict",
        "sobelow --config",
        "test"
      ],
      ci: [
        "deps.audit",
        "compile --warnings-as-errors",
        "format --check-formatted",
        "credo --strict",
        "sobelow --config",
        "dialyzer",
        "test"
      ]
    ]
  end

  defp dialyzer do
    [
      plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
      plt_add_apps: [:mix, :ex_unit],
      flags: [
        :error_handling,
        :extra_return,
        :missing_return,
        :underspecs,
        :unknown
      ],
      ignore_warnings: ".dialyzer_ignore.exs"
    ]
  end
end
