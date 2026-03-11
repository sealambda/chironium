defmodule Mix.Tasks.Terminology.Import.SnomedSpanish do
  @moduledoc """
  Imports the SNOMED Spanish extension onto an existing international SNOMED import.
  """
  @shortdoc "Import SNOMED Spanish extension"

  use Mix.Task

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [path: :string, base_version: :string])

    path = Keyword.fetch!(opts, :path)
    unless File.dir?(path), do: Mix.raise("Directory not found: #{path}")

    Mix.Task.run("app.start")

    Chironium.Terminology.Importer.Snomed.run_spanish_extension(path, opts)
  end
end
