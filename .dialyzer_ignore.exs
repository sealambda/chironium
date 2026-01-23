# Dialyzer warnings to ignore.
# Format: {file_path, warning_type, line_number} or {file_path, warning_type}.
# Run `mix dialyzer --format short` to see warnings in this format.
[
  # Ash DSL generates opt_anno/section_anno functions with incomplete typespecs.
  # These are internal to Spark/Ash and safe to ignore.
  ~r/opt_anno\/2/,
  ~r/section_anno\/1/,
  # AshPostgres.Repo macro generates all_tenants/0 which raises by design.
  {"lib/chironium/repo.ex", :no_return, 8},
  # CLDR generated module has contract supertype issues from library code.
  {"lib/chironium/cldr.ex", :contract_supertype},
  {"lib/chironium/cldr.ex", :missing_range}
]
