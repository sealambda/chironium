import Config

if config_env() in [:dev, :test] do
  import Dotenvy

  env_dir_prefix = System.get_env("RELEASE_ROOT") || Path.expand("./envs")

  env_vars =
    source!([
      Path.absname(".env", env_dir_prefix),
      Path.absname(".#{config_env()}.env", env_dir_prefix),
      Path.absname(".#{config_env()}.overrides.env", env_dir_prefix),
      System.get_env()
    ])

  System.put_env(env_vars)
end

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/chironium start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :chironium, ChironiumWeb.Endpoint, server: true
end

port = System.get_env("PORT", "4000")

default_host =
  System.get_env("PHX_HOST") ||
    if config_env() == :prod do
      "example.com"
    else
      "localhost"
    end

default_scheme =
  if config_env() == :prod do
    "https"
  else
    "http"
  end

default_redirect_uri =
  if config_env() == :prod do
    "#{default_scheme}://#{default_host}/auth/user/google/callback"
  else
    "#{default_scheme}://#{default_host}:#{port}/auth/user/google/callback"
  end

# Google sign-in is required in production. Development and test can run
# without it: use the development sign-in on the sign-in page instead.
google_oauth_env = fn name ->
  System.get_env(name) ||
    if config_env() == :prod, do: raise("Missing environment variable `#{name}`!")
end

config :chironium, ChironiumWeb.Endpoint,
  http: [port: String.to_integer(port)],
  google_oauth: [
    client_id: google_oauth_env.("GOOGLE_CLIENT_ID"),
    client_secret: google_oauth_env.("GOOGLE_CLIENT_SECRET"),
    redirect_uri: System.get_env("GOOGLE_REDIRECT_URI") || default_redirect_uri
  ]

# Email needs a Resend key. Outside production the mailer stays on the local
# mailbox, so any value turns email on without sending anything.
email_enabled? =
  config_env() == :test or System.get_env("RESEND_API_KEY") not in [nil, ""]

config :chironium, Chironium.Notifications, email_enabled?: email_enabled?

# The AGPL requires a modified version run as a network service to offer its
# source to users; point this at your fork when you deploy changes.
config :chironium,
  source_code_url: System.get_env("SOURCE_CODE_URL", "https://github.com/sealambda/chironium")

# The sign-in page links to these documents only when both are set.
config :chironium, :legal_urls,
  terms: System.get_env("TERMS_URL"),
  privacy: System.get_env("PRIVACY_URL")

if config_env() == :prod do
  # database_url =
  #   System.get_env("DATABASE_URL") ||
  #     raise """
  #     environment variable DATABASE_URL is missing.
  #     For example: ecto://USER:PASS@HOST/DATABASE
  #     """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :chironium, Chironium.Repo,
    # TODO Make this configurable.
    # ssl: true,
    # url: database_url,
    database: "chironium",
    username: "chironium",
    socket_dir: "/var/run/postgresql",
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6,
    types: Chironium.PostgrexTypes

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = default_host

  config :chironium, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :chironium, ChironiumWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base,
    cache_static_manifest_latest: PhoenixVite.cache_static_manifest_latest(:chironium)

  config :chironium,
    token_signing_secret:
      System.get_env("TOKEN_SIGNING_SECRET") ||
        raise("Missing environment variable `TOKEN_SIGNING_SECRET`!"),
    # App URL for post-authentication redirects.
    # In production, this should be the full URL of the app (e.g., https://app.chironium.com).
    # Defaults to /app for same-origin deployments where the app is served from the same domain.
    app_url: "/app",
    # Allowed origins for secure post-authentication redirects.
    # Comma-separated list of origins (e.g., "https://app.chironium.com,https://staging.chironium.com").
    # Only referrers from these origins will be trusted for redirects after authentication.
    allowed_app_origins:
      (System.get_env("ALLOWED_APP_ORIGINS") || "")
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :chironium, ChironiumWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :chironium, ChironiumWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.

  # ## Configuring the mailer
  #
  # The adapter is configured at compile-time in config/prod.exs
  # (Swoosh.ApiClient.Req). Only the API key is set at runtime.
  if api_key = System.get_env("RESEND_API_KEY") do
    config :chironium, Chironium.Mailer,
      adapter: Swoosh.Adapters.Resend,
      api_key: api_key
  end

  # PostHog product analytics and error tracking, off unless a project key is set.
  posthog_api_key = System.get_env("POSTHOG_API_KEY")
  posthog_enabled = posthog_api_key not in [nil, ""]

  config :posthog,
    enable: posthog_enabled,
    enable_error_tracking: posthog_enabled,
    api_host: System.get_env("POSTHOG_HOST", "https://eu.i.posthog.com"),
    api_key: if(posthog_enabled, do: posthog_api_key, else: "disabled")

  # Sender address for transactional emails.
  config :chironium, :email_from,
    name: System.get_env("EMAIL_FROM_NAME", "Chironium"),
    address: System.get_env("EMAIL_FROM_ADDRESS", "chironium@updates.appfor.it")
end
