import Config

# Configure the Vite manifest path for compile-time static asset resolution.
# PhoenixVite uses this manifest to resolve hashed asset filenames in production.
config :chironium, ChironiumWeb.Endpoint, cache_static_manifest: "priv/static/.vite/manifest.json"

# Force using SSL in production. This also sets the "strict-transport-security" header,
# known as HSTS. If you have a health check endpoint, you may want to exclude it below.
# Note `:force_ssl` is required to be set at compile-time.
config :chironium, ChironiumWeb.Endpoint,
  force_ssl: [rewrite_on: [:x_forwarded_proto]],
  exclude: [
    # Exclude health check endpoints from SSL redirect if needed.
    # paths: ["/health"],
    hosts: ["localhost", "127.0.0.1"]
  ]

# Configure Swoosh API Client
config :swoosh, api_client: Swoosh.ApiClient.Req

# Disable Swoosh Local Memory Storage
config :swoosh, local: false

# Do not print debug messages in production
config :logger, level: :info

# PostHog is configured at compile time because the project token is public
# (it is already inlined in the frontend JS bundle by Vite). The VITE_POSTHOG_KEY
# build arg is forwarded as an ENV in the Dockerfile so it is available here.
posthog_api_key = System.get_env("VITE_POSTHOG_KEY")

posthog_enabled =
  case posthog_api_key do
    nil -> false
    "" -> false
    _ -> true
  end

config :posthog,
  enable: posthog_enabled,
  enable_error_tracking: posthog_enabled,
  api_host: System.get_env("VITE_POSTHOG_HOST") || "https://eu.i.posthog.com",
  api_key: posthog_api_key || "disabled",
  in_app_otp_apps: [:chironium]

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
