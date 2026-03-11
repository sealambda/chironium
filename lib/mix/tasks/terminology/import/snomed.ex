defmodule Mix.Tasks.Terminology.Import.Snomed do
  @moduledoc "Imports SNOMED CT terminology from a local extracted RF2 release directory."
  @shortdoc "Import SNOMED CT terminology"

  use Mix.Task

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [path: :string, version: :string, force: :boolean])

    path = Keyword.fetch!(opts, :path)
    unless File.dir?(path), do: Mix.raise("Directory not found: #{path}")

    Mix.Task.run("app.start")

    Chironium.Terminology.Importer.Snomed.run(path, opts)
  end
end
