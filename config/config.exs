# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :phoenix_vite, PhoenixVite.Npm,
  assets: [args: [], cd: Path.expand("../assets", __DIR__)],
  vite: [
    args: ~w(exec -- vite),
    cd: Path.expand("../assets", __DIR__),
    env: %{"MIX_BUILD_PATH" => Mix.Project.build_path()}
  ],
  # Standalone Tailwind CLI for the Phoenix-only stylesheet (`assets/css/app.css`).
  # Compiled outside of Vite to isolate daisyUI from the SPA build pipeline.
  # Docs: https://tailwindcss.com/docs/installation/tailwind-cli
  tailwindcss: [
    args: ~w(exec -- tailwindcss),
    cd: Path.expand("../assets", __DIR__)
  ]

config :ex_cldr, default_backend: Chironium.Cldr
config :elixir, :time_zone_database, Tz.TimeZoneDatabase

config :ash_oban, pro?: false

config :chironium, Oban,
  engine: Oban.Engines.Basic,
  notifier: Oban.Notifiers.Postgres,
  queues: [default: 10, notifications: 5, task_send_reminder: 5],
  repo: Chironium.Repo,
  plugins: [{Oban.Plugins.Cron, []}]

config :ash_graphql, authorize_update_destroy_with_error?: true

config :ash,
  allow_forbidden_field_for_relationships_by_default?: true,
  include_embedded_source_by_default?: false,
  show_keysets_for_all_actions?: false,
  default_page_type: :keyset,
  policies: [no_filter_static_forbidden_reads?: false],
  keep_read_action_loads_when_loading?: false,
  default_actions_require_atomic?: true,
  read_action_after_action_hooks_in_order?: true,
  bulk_actions_default_to_errors?: true,
  transaction_rollback_on_error?: true,
  default_string_length_count: :codepoints,
  known_types: [AshPostgres.Timestamptz, AshPostgres.TimestamptzUsec, AshMoney.Types.Money],
  custom_types: [money: AshMoney.Types.Money]

ash_resource_section_order = [
  :admin,
  :authentication,
  :token,
  :user_identity,
  :postgres,
  :archive,
  :graphql,
  :resource,
  :code_interface,
  :actions,
  :policies,
  :pub_sub,
  :preparations,
  :changes,
  :validations,
  :multitenancy,
  :attributes,
  :relationships,
  :calculations,
  :aggregates,
  :identities
]

config :spark,
  formatter: [
    remove_parens?: true,
    "Ash.Resource": [
      section_order: ash_resource_section_order
    ],
    "Ash.Domain": [
      section_order: [
        :admin,
        :graphql,
        :resources,
        :policies,
        :authorization,
        :domain,
        :execution
      ]
    ],
    "Chironium.BaseResources.Auditable": [
      type: Ash.Resource,
      section_order: ash_resource_section_order
    ],
    "Chironium.BaseResources.Identifiable": [
      type: Ash.Resource,
      section_order: ash_resource_section_order
    ],
    "Chironium.BaseResources.Tenantable": [
      type: Ash.Resource,
      section_order: ash_resource_section_order
    ]
  ]

config :chironium,
  ecto_repos: [Chironium.Repo],
  generators: [timestamp_type: :utc_datetime],
  # Default app URL for post-authentication redirect (overridden per environment).
  app_url: "/app",
  # Allowed origins for secure post-authentication redirects.
  # Configure per environment (dev.exs, runtime.exs).
  # Only referrers from these origins will be trusted for redirects.
  allowed_app_origins: [],
  ash_domains: [
    Chironium.Accounts,
    Chironium.CRM,
    Chironium.Health,
    Chironium.Subscriptions,
    Chironium.Terminology
  ],
  base_resources: [
    Chironium.BaseResources.Auditable,
    Chironium.BaseResources.Tenantable
  ]

# Principal resolution: maps PrincipalGrant types to domain resolvers.
config :chironium, Chironium.Accounts.ActorResolver,
  principal_resolvers: %{
    practitioner: Chironium.Health.PrincipalResolver,
    patient: Chironium.Health.PatientPrincipalResolver
  }

# Configure the endpoint
config :chironium, ChironiumWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: ChironiumWeb.ErrorHTML, json: ChironiumWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Chironium.PubSub,
  live_view: [signing_salt: "/s1kp4jt"]

# Configure the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :chironium, Chironium.Mailer, adapter: Swoosh.Adapters.Local

# Default sender address for transactional emails.
config :chironium, :email_from, name: "Chironium", address: "chironium@updates.appfor.it"

# PostHog stays disabled unless config/runtime.exs finds POSTHOG_API_KEY in production.
config :posthog,
  enable: false,
  test_mode: config_env() == :test,
  in_app_otp_apps: [:chironium]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Redact credentials from request logs. Overrides Phoenix's default of ["password"].
config :phoenix, :filter_parameters, ["password", "token", "secret"]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
