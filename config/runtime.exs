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

config :chironium, ChironiumWeb.Endpoint,
  http: [port: String.to_integer(port)],
  google_oauth: [
    client_id:
      System.get_env("GOOGLE_CLIENT_ID") ||
        raise("Missing environment variable `GOOGLE_CLIENT_ID`!"),
    client_secret:
      System.get_env("GOOGLE_CLIENT_SECRET") ||
        raise("Missing environment variable `GOOGLE_CLIENT_SECRET`!"),
    redirect_uri: System.get_env("GOOGLE_REDIRECT_URI") || default_redirect_uri
  ]

if config_env() == :prod do
  # database_url =
  #   System.get_env("DATABASE_URL") ||
  #     raise """
  #     environment variable DATABASE_URL is missing.
  #     For example: ecto://USER:PASS@HOST/DATABASE
  #     """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :chironium, Chironium.Repo,
    # TODO Make this configurable
    # ssl: true,
    # url: database_url,
    database: "chironium",
    username: "chironium",
    socket_dir: "/var/run/postgresql",
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

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
    # PWA URL for post-authentication redirects.
    # In production, this should be the full URL of the PWA (e.g., https://app.chironium.com).
    # Defaults to /app for same-origin deployments where PWA is served from the same domain.
    pwa_url: System.get_env("PWA_URL", "/app"),
    # Allowed PWA origins for secure post-authentication redirects.
    # Comma-separated list of origins (e.g., "https://app.chironium.com,https://staging.chironium.com").
    # Only referrers from these origins will be trusted for redirects after authentication.
    allowed_pwa_origins:
      (System.get_env("ALLOWED_PWA_ORIGINS") || "")
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
  # In production you need to configure the mailer to use a different adapter.
  # Here is an example configuration for Mailgun:
  #
  #     config :chironium, Chironium.Mailer,
  #       adapter: Swoosh.Adapters.Mailgun,
  #       api_key: System.get_env("MAILGUN_API_KEY"),
  #       domain: System.get_env("MAILGUN_DOMAIN")
  #
  # Most non-SMTP adapters require an API client. Swoosh supports Req, Hackney,
  # and Finch out-of-the-box. This configuration is typically done at
  # compile-time in your config/prod.exs:
  #
  #     config :swoosh, :api_client, Swoosh.ApiClient.Req
  #
  # See https://hexdocs.pm/swoosh/Swoosh.html#module-installation for details.
end
