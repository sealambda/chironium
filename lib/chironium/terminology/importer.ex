require NimbleCSV

NimbleCSV.define(Chironium.Terminology.Importer.CsvParser, separator: ",", escape: "\"")

defmodule Chironium.Terminology.Importer do
  @moduledoc """
  Shared utilities for bulk-importing terminology data (LOINC, SNOMED CT, etc.)
  into CodeSystem / Concept / Designation / ConceptClosure tables via direct Ecto inserts.
  """

  require Logger
  require Ash.Query

  alias Chironium.Repo

  @batch_size 5000
  @log_every 10

  # ── Ecto schemas for type-safe insert_all (bulk data only) ───────────
  # CodeSystem uses Ash.Seed (single row, handles enums/defaults).
  # Bulk tables use Repo.insert_all for throughput on 100K–1M+ rows.

  defmodule Schema.Concept do
    @moduledoc false
    use Ecto.Schema

    @primary_key {:id, Ecto.UUID, autogenerate: false}
    schema "concepts" do
      field :code, :string
      field :active, :boolean
      field :code_system_id, Ecto.UUID
    end
  end

  defmodule Schema.Designation do
    @moduledoc false
    use Ecto.Schema

    @primary_key {:id, Ecto.UUID, autogenerate: false}
    schema "designations" do
      field :language, :string
      field :value, :string
      field :use, :string
      field :concept_id, Ecto.UUID
    end
  end

  defmodule Schema.ConceptClosure do
    @moduledoc false
    use Ecto.Schema

    @primary_key {:id, Ecto.UUID, autogenerate: false}
    schema "concept_closures" do
      field :depth, :integer
      field :parent_id, Ecto.UUID
      field :child_id, Ecto.UUID
    end
  end

  # ── Streaming Parsers ────────────────────────────────────────────────

  @doc "Streams a comma-delimited CSV into `%{header => value}` maps."
  def stream_csv(path) do
    path
    |> File.stream!(read_ahead: 64 * 1024)
    |> __MODULE__.CsvParser.parse_stream(skip_headers: false)
    |> rows_to_maps()
  end

  @doc "Streams a tab-delimited RF2 file into `%{header => value}` maps."
  def stream_tsv(path) do
    path
    |> File.stream!(read_ahead: 64 * 1024)
    |> Stream.map(&String.trim_trailing(&1, "\n"))
    |> Stream.map(&String.trim_trailing(&1, "\r"))
    |> Stream.map(&String.split(&1, "\t", trim: false))
    |> rows_to_maps()
  end

  defp rows_to_maps(parsed) do
    Stream.transform(parsed, nil, fn row, headers ->
      case headers do
        nil -> {[], row}
        _ -> {[Enum.zip(headers, row) |> Map.new()], headers}
      end
    end)
  end

  # ── Batch Insert ─────────────────────────────────────────────────────

  @doc """
  Inserts an enumerable of row maps into `schema` in batches.
  Uses `ON CONFLICT DO NOTHING` for idempotent re-runs.
  Returns the total number of rows inserted.
  """
  def batch_insert_stream(schema, enumerable, opts \\ []) do
    size = Keyword.get(opts, :batch_size, @batch_size)
    label = Keyword.get(opts, :label, inspect(schema))
    start = System.monotonic_time(:millisecond)

    {total, batches} =
      enumerable
      |> Stream.chunk_every(size)
      |> Enum.reduce({0, 0}, fn batch, {total, n} ->
        {count, _} = Repo.insert_all(schema, batch, on_conflict: :nothing)
        new_total = total + count
        new_n = n + 1

        if rem(new_n, @log_every) == 0 do
          elapsed = System.monotonic_time(:millisecond) - start
          Logger.info("[#{label}] #{new_total} rows (batch #{new_n}, #{elapsed} ms)")
        end

        {new_total, new_n}
      end)

    elapsed = System.monotonic_time(:millisecond) - start
    Logger.info("[#{label}] Done: #{total} rows in #{batches} batches (#{elapsed} ms)")
    total
  end

  # ── ID Generation ────────────────────────────────────────────────────

  @doc "Generates a new UUIDv7 string."
  def generate_id, do: Ash.UUIDv7.generate()

  # ── CodeSystem Helpers ───────────────────────────────────────────────

  @doc "Looks up a CodeSystem by canonical URL and version. Returns the record or nil."
  def find_code_system(url, version) do
    Chironium.Terminology.CodeSystem
    |> Ash.Query.filter(url == ^url and version == ^version)
    |> Ash.read_one!(authorize?: false)
  end

  @doc """
  Ensures a CodeSystem row is ready for import.

  - If none exists, creates one and returns `{:ok, id}`.
  - With `force: true`, deletes existing data and re-creates.
  - Without force, returns `:exists` so callers can skip the import.
  """
  def ensure_code_system!(attrs, opts \\ []) do
    force = Keyword.get(opts, :force, false)

    case {find_code_system(attrs.url, attrs.version), force} do
      {nil, _} ->
        {:ok, insert_code_system!(attrs)}

      {%{id: id}, true} ->
        delete_code_system!(id)
        {:ok, insert_code_system!(attrs)}

      {%{id: id}, false} ->
        Logger.warning(
          "[CodeSystem] #{attrs.url}|#{attrs.version} already exists (#{id}). Pass --force to reimport."
        )

        :exists
    end
  end

  @doc "Inserts a single CodeSystem row via Ash.Seed and returns its UUID string."
  def insert_code_system!(attrs) do
    record = Ash.Seed.seed!(Chironium.Terminology.CodeSystem, attrs)
    Logger.info("[CodeSystem] Created #{attrs.url}|#{attrs.version} (#{record.id})")
    record.id
  end

  @doc "Removes a CodeSystem and all dependent rows (closures, designations, embeddings, concepts)."
  def delete_code_system!(cs_id) do
    Logger.info("[Cleanup] Removing code system #{cs_id}...")
    bin = dump_uuid!(cs_id)

    concept_sub = "(SELECT id FROM concepts WHERE code_system_id = $1)"

    %{num_rows: cc} =
      sql!(
        "DELETE FROM concept_closures WHERE parent_id IN #{concept_sub} OR child_id IN #{concept_sub}",
        [bin]
      )

    %{num_rows: d} = sql!("DELETE FROM designations WHERE concept_id IN #{concept_sub}", [bin])
    sql!("DELETE FROM concept_embeddings WHERE concept_id IN #{concept_sub}", [bin])
    %{num_rows: co} = sql!("DELETE FROM concepts WHERE code_system_id = $1", [bin])
    %{num_rows: cs} = sql!("DELETE FROM code_systems WHERE id = $1", [bin])

    Logger.info(
      "[Cleanup] Removed #{cs} code_systems, #{co} concepts, #{d} designations, #{cc} closures."
    )
  end

  # ── Transitive Closure ───────────────────────────────────────────────

  @doc """
  Iteratively computes the transitive closure for a code system's hierarchy.
  Expands depth-1 edges level by level until no new rows are produced.
  """
  def compute_transitive_closure(code_system_id) do
    Logger.info("[Closure] Computing transitive closure...")
    total = expand_closure(code_system_id, 1, 0)
    Logger.info("[Closure] Done: #{total} transitive rows.")
    total
  end

  defp expand_closure(cs_id, depth, total) do
    next = depth + 1

    %{num_rows: n} =
      sql!(
        """
        INSERT INTO concept_closures (id, parent_id, child_id, depth)
        SELECT gen_random_uuid(), a.parent_id, b.child_id, $1
        FROM concept_closures a
        JOIN concept_closures b ON a.child_id = b.parent_id AND b.depth = 1
        JOIN concepts c          ON a.parent_id = c.id
        WHERE a.depth = $2 AND c.code_system_id = $3
        ON CONFLICT DO NOTHING
        """,
        [next, depth, dump_uuid!(cs_id)]
      )

    new_total = total + n
    Logger.info("[Closure] Depth #{next}: +#{n} (total: #{new_total})")

    if n == 0, do: new_total, else: expand_closure(cs_id, next, new_total)
  end

  # ── File Discovery ───────────────────────────────────────────────────

  @doc "Finds exactly one file matching a glob pattern under `dir`, raising otherwise."
  def find_file!(dir, pattern) do
    case Path.wildcard(Path.join(dir, pattern)) do
      [file] -> file
      [] -> raise "No file matching #{pattern} in #{dir}"
      files -> raise "Ambiguous: #{length(files)} files match #{pattern} in #{dir}"
    end
  end

  @doc "Finds a CodeSystem by URL/version and returns its UUID, raising if missing."
  def find_code_system_id!(url, version) do
    case find_code_system(url, version) do
      %{id: id} ->
        id

      nil ->
        raise "CodeSystem #{url}|#{version} not found. Import it first."
    end
  end

  @doc "Loads a full `%{code => concept_id}` map for one CodeSystem."
  def load_code_map(code_system_id) do
    import Ecto.Query

    Repo.all(
      from(c in Schema.Concept,
        where: c.code_system_id == ^code_system_id,
        select: {c.code, c.id}
      )
    )
    |> Map.new()
  end

  # ── Private Helpers ──────────────────────────────────────────────────

  defp sql!(query, params) do
    Ecto.Adapters.SQL.query!(Repo, query, params, timeout: :infinity)
  end

  defp dump_uuid!(str) do
    {:ok, bin} = Ecto.UUID.dump(str)
    bin
  end
end
