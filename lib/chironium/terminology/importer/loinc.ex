defmodule Chironium.Terminology.Importer.Loinc do
  @moduledoc """
  Imports LOINC terminology from a local extracted release directory into
  CodeSystem, Concept, Designation, and ConceptClosure tables.

  Source layout expected under `path`:

      LoincTable/Loinc.csv
      AccessoryFiles/PartFile/Part.csv
      AccessoryFiles/ComponentHierarchyBySystem/ComponentHierarchyBySystem.csv
  """

  require Logger

  alias Chironium.Terminology.Importer

  @url "http://loinc.org"
  @default_version "2.82"

  @doc """
  Runs the full LOINC import pipeline.

  Options:
    - `:version` – LOINC version string (default `#{@default_version}`)
    - `:force`   – delete existing data before importing (default `false`)
  """
  def run(path, opts \\ []) do
    version = Keyword.get(opts, :version, @default_version)
    force = Keyword.get(opts, :force, false)

    Logger.info("[LOINC] Starting import from #{path} (version #{version})")

    case Importer.ensure_code_system!(
           %{
             url: @url,
             version: version,
             name: "LOINC",
             title: "Logical Observation Identifiers Names and Codes",
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
        Logger.info("[LOINC] Import complete.")

      :exists ->
        :ok
    end
  end

  # ── Step 1: Concepts (LOINC_NUM + LP Parts) ─────────────────────────

  defp import_concepts(path, cs_id) do
    loinc_map = import_loinc_concepts(path, cs_id)
    part_map = import_part_concepts(path, cs_id)
    Map.merge(loinc_map, part_map)
  end

  defp import_loinc_concepts(path, cs_id) do
    file = Path.join(path, "LoincTable/Loinc.csv")
    Logger.info("[LOINC] Importing LOINC_NUM concepts from #{file}...")

    rows =
      file
      |> Importer.stream_csv()
      |> Stream.filter(&(String.trim(&1["LOINC_NUM"]) != ""))
      |> Enum.map(fn row ->
        %{
          id: Importer.generate_id(),
          code: row["LOINC_NUM"],
          active: row["STATUS"] == "ACTIVE",
          code_system_id: cs_id
        }
      end)

    code_map = Map.new(rows, &{&1.code, &1.id})
    Importer.batch_insert_stream(Importer.Schema.Concept, rows, label: "LOINC Concepts")
    code_map
  end

  defp import_part_concepts(path, cs_id) do
    file = Path.join(path, "AccessoryFiles/PartFile/Part.csv")
    Logger.info("[LOINC] Importing LP Part concepts from #{file}...")

    rows =
      file
      |> Importer.stream_csv()
      |> Stream.filter(&(String.trim(&1["PartNumber"]) != ""))
      |> Enum.map(fn row ->
        %{
          id: Importer.generate_id(),
          code: row["PartNumber"],
          active: row["Status"] == "ACTIVE",
          code_system_id: cs_id
        }
      end)

    code_map = Map.new(rows, &{&1.code, &1.id})
    Importer.batch_insert_stream(Importer.Schema.Concept, rows, label: "LOINC Parts")
    code_map
  end

  # ── Step 2: Designations ─────────────────────────────────────────────

  defp import_designations(path, code_map) do
    import_loinc_designations(path, code_map)
    import_part_designations(path, code_map)
  end

  defp import_loinc_designations(path, code_map) do
    file = Path.join(path, "LoincTable/Loinc.csv")
    Logger.info("[LOINC] Importing LOINC designations from #{file}...")

    stream =
      file
      |> Importer.stream_csv()
      |> Stream.flat_map(fn row ->
        case Map.get(code_map, row["LOINC_NUM"]) do
          nil -> []
          concept_id -> loinc_designations(row, concept_id)
        end
      end)

    Importer.batch_insert_stream(Importer.Schema.Designation, stream, label: "LOINC Designations")
  end

  defp loinc_designations(row, concept_id) do
    lcn = String.trim(row["LONG_COMMON_NAME"] || "")
    short = String.trim(row["SHORTNAME"] || "")
    display = String.trim(row["DisplayName"] || "")

    []
    |> maybe_add(concept_id, "display", lcn)
    |> maybe_add(concept_id, "short-name", short)
    |> then(fn desigs ->
      if display != "" and display != lcn,
        do: [designation(concept_id, "consumer", display) | desigs],
        else: desigs
    end)
  end

  defp import_part_designations(path, code_map) do
    file = Path.join(path, "AccessoryFiles/PartFile/Part.csv")
    Logger.info("[LOINC] Importing Part designations from #{file}...")

    stream =
      file
      |> Importer.stream_csv()
      |> Stream.flat_map(fn row ->
        code = row["PartNumber"]
        name = String.trim(row["PartDisplayName"] || "")
        concept_id = Map.get(code_map, code)

        if concept_id && name != "",
          do: [designation(concept_id, "display", name)],
          else: []
      end)

    Importer.batch_insert_stream(Importer.Schema.Designation, stream,
      label: "LOINC Part Designations"
    )
  end

  defp maybe_add(desigs, _concept_id, _use, ""), do: desigs

  defp maybe_add(desigs, concept_id, use, value),
    do: [designation(concept_id, use, value) | desigs]

  defp designation(concept_id, use, value) do
    %{id: Importer.generate_id(), language: "en", value: value, use: use, concept_id: concept_id}
  end

  # ── Step 3: Hierarchy (direct parent-child edges) ────────────────────

  defp import_hierarchy(path, code_map) do
    file =
      Path.join(path, "AccessoryFiles/ComponentHierarchyBySystem/ComponentHierarchyBySystem.csv")

    Logger.info("[LOINC] Importing hierarchy from #{file}...")

    stream =
      file
      |> Importer.stream_csv()
      |> Stream.flat_map(fn row ->
        parent_code = row["IMMEDIATE_PARENT"]
        child_code = row["CODE"]

        with true <- is_binary(parent_code) and parent_code != "",
             true <- parent_code != child_code,
             parent_id when not is_nil(parent_id) <- Map.get(code_map, parent_code),
             child_id when not is_nil(child_id) <- Map.get(code_map, child_code) do
          [%{id: Importer.generate_id(), parent_id: parent_id, child_id: child_id, depth: 1}]
        else
          _ -> []
        end
      end)

    Importer.batch_insert_stream(Importer.Schema.ConceptClosure, stream, label: "LOINC Hierarchy")
  end
end
