defmodule Chironium.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ChironiumWeb.Telemetry,
      Chironium.Repo,
      {DNSCluster, query: Application.get_env(:chironium, :dns_cluster_query) || :ignore},
      {Oban,
       AshOban.config(
         Application.fetch_env!(:chironium, :ash_domains),
         Application.fetch_env!(:chironium, Oban)
       )},
      {Phoenix.PubSub, name: Chironium.PubSub},
      Chironium.Automation.EventListener,
      # Start a worker by calling: Chironium.Worker.start_link(arg)
      # {Chironium.Worker, arg},
      # Start to serve requests, typically the last entry
      ChironiumWeb.Endpoint,
      {AshAuthentication.Supervisor, [otp_app: :chironium]},
      {Absinthe.Subscription, ChironiumWeb.Endpoint},
      AshGraphql.Subscription.Batcher
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Chironium.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ChironiumWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
