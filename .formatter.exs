[
  import_deps: [
    :absinthe,
    :ash,
    :ash_admin,
    :ash_archival,
    :ash_authentication,
    :ash_authentication_phoenix,
    :ash_graphql,
    :ash_money,
    :ash_oban,
    :ash_paper_trail,
    :ash_phoenix,
    :ash_postgres,
    :ash_state_machine,
    :ecto,
    :ecto_sql,
    :oban,
    :phoenix,
    :reactor
  ],
  subdirectories: ["priv/*/migrations"],
  plugins: [Absinthe.Formatter, Spark.Formatter, Phoenix.LiveView.HTMLFormatter],
  inputs: ["*.{heex,ex,exs}", "{config,lib,test}/**/*.{heex,ex,exs}", "priv/*/seeds.exs"]
]
