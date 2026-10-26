defmodule Chironium.MixProject do
  use Mix.Project

  def project do
    [
      app: :chironium,
      version: "0.3.0",
      elixir: "~> 1.19",
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
      # {:phoenix_vite, "~> 0.4"},
      {:phoenix_vite, github: "sealambda/phoenix_vite", branch: "fix/react"},
      {:ex_money_sql, "~> 2.1"},
      {:ex_cldr, "~> 2.0"},
      {:ex_cldr_calendars, "~> 2.4"},
      {:ex_cldr_dates_times, "~> 2.25"},
      {:ex_cldr_lists, "~> 2.11"},
      {:ex_cldr_person_names, "~> 1.1"},
      {:ex_cldr_territories, "~> 2.11"},
      {:ex_cldr_units, "~> 3.20"},
      {:ash_money, "~> 0.2"},
      {:absinthe_phoenix, "~> 2.0"},
      {:ash_graphql, "~> 1.0"},
      {:picosat_elixir, "~> 0.2"},
      {:sourceror, "~> 1.8", only: [:dev, :test]},
      {:oban, "~> 2.0"},
      {:hammer, "~> 7.0"},
      {:usage_rules, "~> 1.2", only: [:dev]},
      {:ash_paper_trail, "~> 0.5"},
      {:live_debugger, "~> 1.0", only: [:dev]},
      {:ash_state_machine, "~> 0.2"},
      {:oban_web, "~> 2.0"},
      {:ash_oban, "~> 0.7"},
      {:ash_admin, "~> 1.3"},
      {:ash_archival, "~> 2.0.3"},
      {:ash_authentication_phoenix, "~> 2.0"},
      {:ash_authentication, "~> 4.0"},
      {:ash_postgres, "~> 2.0"},
      {:ash_phoenix, "~> 2.0"},
      {:ash, "~> 3.0"},
      {:igniter, "~> 0.6", only: [:dev, :test]},
      {:phoenix, "~> 1.8.3"},
      {:phoenix_ecto, "~> 4.5"},
      {:dotenvy, "~> 1.2"},
      {:ecto_sql, "~> 3.13"},
      {:nimble_csv, "~> 1.3"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 1.2.0"},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.9.1"},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.2.0",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.16"},
      {:premailex, "~> 1.0"},
      {:req, "~> 0.7"},
      {:posthog, "~> 2.6"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:tz, "~> 0.28"},
      {:dns_cluster, "~> 0.3.1"},
      {:bandit, "~> 1.5"},
      # Needed in prod for seeding
      {:faker, "~> 0.19-alpha.1"},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false},
      {:sobelow, "~> 0.13", only: [:dev, :test], runtime: false}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: [
        "deps.get",
        "ash.setup --quiet",
        "assets.setup",
        "assets.codegen",
        "assets.build",
        "run priv/repo/seeds.exs"
      ],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ash.setup --quiet", "test"],
      "assets.setup": ["cmd sh -c 'pnpm install --frozen-lockfile'"],
      "assets.build": ["cmd sh -c 'pnpm --dir assets build'"],
      "assets.codegen": ["cmd sh -c 'pnpm --dir assets gql:generate'"],
      precommit: ["compile --warnings-as-errors", "deps.unlock --unused", "format", "test"],

      # Clean rebuild for branch switching - preserves migrations,
      rebuild: [
        "cmd rm -rf _build deps assets/node_modules",
        "deps.get",
        "compile",
        "deps.unlock --unused",
        "rebuild.finalize"
      ],

      # Finalize rebuild - reset database, seed, and build assets.
      "rebuild.finalize": [
        # Uses ash.reset (not ecto.reset) to handle all Ash extensions: Oban, paper_trail, events, etc.
        "ash.reset",
        "assets.setup",
        "assets.codegen",
        "assets.build"
      ],

      # Nuclear rebuild - regenerates all migrations (pre-production only!)
      "rebuild.nuke": [
        "cmd sh -c \"rm -rf _build deps assets/node_modules priv/repo/migrations priv/repo/tenant_migrations priv/resource_snapshots priv/plts mix.lock\"",
        "deps.get",
        "compile",
        "deps.unlock --unused",
        "oban.install",
        "ash.codegen init",
        "compile",
        "rebuild.finalize"
      ],

      # Quality - comprehensive checks including type checking (slow).
      quality: [
        "compile --warnings-as-errors",
        "format --check-formatted",
        "credo --strict",
        "sobelow --config",
        "dialyzer"
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
