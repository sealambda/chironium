# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# This file orchestrates all seed files in the correct order.
# Individual seed files can also be run separately:
#
#     mix run priv/repo/seeds/pathology_categories.exs
#     mix run priv/repo/seeds/pathology_catalog.exs
#     mix run priv/repo/seeds/cycle_symptom_catalog.exs

IO.puts("=== Chironium Database Seeding ===\n")

# Reference catalogs (order matters for dependencies).
seed_files = [
  "priv/repo/seeds/pathology_categories.exs",
  "priv/repo/seeds/pathology_catalog.exs",
  "priv/repo/seeds/cycle_symptom_catalog.exs"
]

for file <- seed_files do
  if File.exists?(file) do
    IO.puts("\n--- Running #{file} ---\n")
    Code.eval_file(file)
  else
    IO.puts("⚠ Skipping #{file} (not found)")
  end
end

IO.puts("\n=== Seeding Complete ===")
