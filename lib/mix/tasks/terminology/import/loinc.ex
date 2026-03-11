defmodule Mix.Tasks.Terminology.Import.Loinc do
  @moduledoc "Imports LOINC terminology from a local extracted release directory."
  @shortdoc "Import LOINC terminology"

  use Mix.Task

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, strict: [path: :string, version: :string, force: :boolean])

    path = Keyword.fetch!(opts, :path)
    unless File.dir?(path), do: Mix.raise("Directory not found: #{path}")

    Mix.Task.run("app.start")

    Chironium.Terminology.Importer.Loinc.run(path, opts)
  end
end
