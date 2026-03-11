# https://hexdocs.pm/ash_postgres/AshPostgres.Extensions.Vector.html

Postgrex.Types.define(
  Chironium.PostgrexTypes,
  [AshPostgres.Extensions.Vector] ++ Ecto.Adapters.Postgres.extensions(),
  []
)
