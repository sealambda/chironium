import Config

# Hashed asset filenames come from Vite's manifest through `cache_static_manifest_latest` in
# runtime.exs. Do not set `cache_static_manifest`: Phoenix would read Vite's manifest as its
# own `phx.digest` format and log "Could not warm up static assets" on every boot.

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

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
