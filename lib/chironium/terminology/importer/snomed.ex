defmodule Chironium.Terminology.Importer.Snomed do
  @moduledoc """
  Imports SNOMED CT from a local extracted RF2 release directory into
  CodeSystem, Concept, Designation, and ConceptClosure tables.

  Expects the standard RF2 Snapshot layout under `path`:

      Snapshot/Terminology/sct2_Concept_Snapshot_INT_*.txt
      Snapshot/Terminology/sct2_Description_Snapshot-en_INT_*.txt
      Snapshot/Terminology/sct2_Relationship_Snapshot_INT_*.txt
  """

  require Logger

  alias Chironium.Terminology.Importer

  @url "http://snomed.info/sct"
  @default_version "20260301"

  @is_a_type_id "116680003"

  @doc """
  Runs the full SNOMED CT import pipeline.

  Options:
    - `:version` – SNOMED version string (default `#{@default_version}`)
    - `:force`   – delete existing data before importing (default `false`)
  """
  def run(path, opts \\ []) do
    version = Keyword.get(opts, :version, @default_version)
    force = Keyword.get(opts, :force, false)

    Logger.info("[SNOMED] Starting import from #{path} (version #{version})")

    case Importer.ensure_code_system!(
           %{
             url: @url,
             version: version,
             name: "SNOMEDCT",
             title: "SNOMED Clinical Terms",
             status: :active,
             content: :complete
           },
           force: force
         ) do
      {:ok, cs_id} ->
        code_map = import_concepts(path, cs_id)
        import_designations(path, code_map)
        import_hierarchy(path, code_map)
        Importer.compute_transitive_closure(cs_id)
        Logger.info("[SNOMED] Import complete.")

      :exists ->
        :ok
    end
  end

  @doc """
  Imports the Spanish SNOMED extension onto an already imported international SNOMED CodeSystem.

  Options:
    - `:base_version` – international SNOMED version to enrich (default `#{@default_version}`)
  """
  def run_spanish_extension(path, opts \\ []) do
    base_version = Keyword.get(opts, :base_version, @default_version)

    Logger.info(
      "[SNOMED-ES] Starting Spanish extension import from #{path} (base #{base_version})"
    )

    cs_id = Importer.find_code_system_id!(@url, base_version)
    import_extension_concepts(path, cs_id)
    code_map = Importer.load_code_map(cs_id)
    import_spanish_descriptions(path, code_map)
    import_spanish_text_definitions(path, code_map)
    import_extension_hierarchy(path, code_map)
    Importer.compute_transitive_closure(cs_id)
    Logger.info("[SNOMED-ES] Import complete.")
  end

  # ── Step 1: Concepts ─────────────────────────────────────────────────

  defp import_concepts(path, cs_id) do
    file = Importer.find_file!(path, "Snapshot/Terminology/sct2_Concept_Snapshot_INT_*.txt")
    Logger.info("[SNOMED] Importing concepts from #{file}...")

    rows =
      file
      |> Importer.stream_tsv()
      |> Enum.map(fn row ->
        %{
          id: Importer.generate_id(),
          code: row["id"],
          active: row["active"] == "1",
          code_system_id: cs_id
        }
      end)

    code_map = Map.new(rows, &{&1.code, &1.id})
    Importer.batch_insert_stream(Importer.Schema.Concept, rows, label: "SNOMED Concepts")
    code_map
  end

  # ── Step 2: Designations ─────────────────────────────────────────────

  defp import_designations(path, code_map) do
    file =
      Importer.find_file!(path, "Snapshot/Terminology/sct2_Description_Snapshot-en_INT_*.txt")

    Logger.info("[SNOMED] Importing descriptions from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.filter(&(&1["active"] == "1"))
      |> Stream.flat_map(fn row ->
        case Map.get(code_map, row["conceptId"]) do
          nil ->
            []

          concept_id ->
            [
              %{
                id: Importer.generate_id(),
                language: row["languageCode"],
                value: row["term"],
                use: description_type(row["typeId"]),
                concept_id: concept_id
              }
            ]
        end
      end)

    Importer.batch_insert_stream(Importer.Schema.Designation, stream,
      label: "SNOMED Descriptions"
    )
  end

  defp description_type("900000000000003001"), do: "fully-specified-name"
  defp description_type("900000000000013009"), do: "synonym"
  defp description_type("900000000000550004"), do: "definition"
  defp description_type(_), do: "synonym"

  # ── Step 3: Is-a hierarchy (direct edges) ────────────────────────────

  defp import_hierarchy(path, code_map) do
    file = Importer.find_file!(path, "Snapshot/Terminology/sct2_Relationship_Snapshot_INT_*.txt")
    Logger.info("[SNOMED] Importing is-a relationships from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.filter(&(&1["active"] == "1" and &1["typeId"] == @is_a_type_id))
      |> Stream.flat_map(fn row ->
        parent_id = Map.get(code_map, row["destinationId"])
        child_id = Map.get(code_map, row["sourceId"])

        if parent_id && child_id,
          do: [%{id: Importer.generate_id(), parent_id: parent_id, child_id: child_id, depth: 1}],
          else: []
      end)

    Importer.batch_insert_stream(Importer.Schema.ConceptClosure, stream,
      label: "SNOMED Is-a Hierarchy"
    )
  end

  # ── Spanish extension ────────────────────────────────────────────────

  defp import_extension_concepts(path, cs_id) do
    file =
      Importer.find_file!(
        path,
        "Snapshot/Terminology/sct2_Concept_SpanishExtensionSnapshot_INT_*.txt"
      )

    Logger.info("[SNOMED-ES] Importing extension concepts from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.map(fn row ->
        %{
          id: Importer.generate_id(),
          code: row["id"],
          active: row["active"] == "1",
          code_system_id: cs_id
        }
      end)

    Importer.batch_insert_stream(Importer.Schema.Concept, stream, label: "SNOMED-ES Concepts")
  end

  defp import_spanish_descriptions(path, code_map) do
    file =
      Importer.find_file!(
        path,
        "Snapshot/Terminology/sct2_Description_SpanishExtensionSnapshot-es_INT_*.txt"
      )

    Logger.info("[SNOMED-ES] Importing Spanish descriptions from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.filter(&(&1["active"] == "1"))
      |> Stream.flat_map(fn row ->
        case Map.get(code_map, row["conceptId"]) do
          nil ->
            []

          concept_id ->
            [
              %{
                id: Importer.generate_id(),
                language: row["languageCode"],
                value: row["term"],
                use: description_type(row["typeId"]),
                concept_id: concept_id
              }
            ]
        end
      end)

    Importer.batch_insert_stream(Importer.Schema.Designation, stream,
      label: "SNOMED-ES Descriptions"
    )
  end

  defp import_spanish_text_definitions(path, code_map) do
    file =
      Importer.find_file!(
        path,
        "Snapshot/Terminology/sct2_TextDefinition_SpanishExtensionSnapshot-es_INT_*.txt"
      )

    Logger.info("[SNOMED-ES] Importing Spanish text definitions from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.filter(&(&1["active"] == "1"))
      |> Stream.flat_map(fn row ->
        case Map.get(code_map, row["conceptId"]) do
          nil ->
            []

          concept_id ->
            [
              %{
                id: Importer.generate_id(),
                language: row["languageCode"],
                value: row["term"],
                use: "definition",
                concept_id: concept_id
              }
            ]
        end
      end)

    Importer.batch_insert_stream(Importer.Schema.Designation, stream,
      label: "SNOMED-ES Text Definitions"
    )
  end

  defp import_extension_hierarchy(path, code_map) do
    file =
      Importer.find_file!(
        path,
        "Snapshot/Terminology/sct2_Relationship_SpanishExtensionSnapshot_INT_*.txt"
      )

    Logger.info("[SNOMED-ES] Importing extension is-a relationships from #{file}...")

    stream =
      file
      |> Importer.stream_tsv()
      |> Stream.filter(&(&1["active"] == "1" and &1["typeId"] == @is_a_type_id))
      |> Stream.flat_map(fn row ->
        parent_id = Map.get(code_map, row["destinationId"])
        child_id = Map.get(code_map, row["sourceId"])

        if parent_id && child_id,
          do: [%{id: Importer.generate_id(), parent_id: parent_id, child_id: child_id, depth: 1}],
          else: []
      end)

    Importer.batch_insert_stream(Importer.Schema.ConceptClosure, stream,
      label: "SNOMED-ES Is-a Hierarchy"
    )
  end
end
