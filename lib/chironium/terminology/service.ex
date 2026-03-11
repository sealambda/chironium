defmodule Chironium.Terminology.Service do
  @moduledoc """
  Terminology lookup and validation helpers shared by embedded FHIR datatypes.
  """

  require Ash.Query

  alias Chironium.Terminology.CodeSystem
  alias Chironium.Terminology.Concept
  alias Chironium.Terminology.ConceptClosure
  alias Chironium.Terminology.Designation

  @preferred_use_order [
    "display",
    "fully-specified-name",
    "synonym",
    "consumer",
    "short-name",
    "definition"
  ]

  @type validation_constraints :: %{
          optional(:ancestor_code) => String.t(),
          optional(:locale) => String.t() | nil
        }

  @spec lookup(String.t(), String.t(), String.t() | nil, String.t() | nil) ::
          {:ok, map()} | {:error, :code_system_not_found | :concept_not_found}
  def lookup(system, code, version \\ nil, language \\ nil) do
    with {:ok, code_system} <- fetch_code_system(system, version),
         {:ok, concept} <- fetch_active_concept(code_system.id, code) do
      {:ok,
       %{
         code_system_id: code_system.id,
         concept_id: concept.id,
         system: code_system.url,
         version: code_system.version,
         code: concept.code,
         active: concept.active,
         display: resolve_designation(concept.id, language)
       }}
    end
  end

  @spec validate_code(
          String.t(),
          String.t(),
          String.t() | nil,
          String.t() | nil,
          validation_constraints()
        ) ::
          :ok
          | {:error, :code_system_not_found}
          | {:error, :concept_not_found}
          | {:error, :display_mismatch}
          | {:error, :not_in_closure}
  def validate_code(system, code, version \\ nil, display \\ nil, constraints \\ %{}) do
    locale = Map.get(constraints, :locale)
    ancestor_code = Map.get(constraints, :ancestor_code)

    with {:ok, lookup_result} <- lookup(system, code, version, locale),
         :ok <- validate_display(display, lookup_result.display),
         :ok <- validate_closure_constraint(system, code, lookup_result.version, ancestor_code) do
      :ok
    end
  end

  @spec code_in_closure?(String.t(), String.t(), String.t() | nil, String.t()) ::
          {:ok, boolean()} | {:error, :code_system_not_found | :concept_not_found}
  def code_in_closure?(system, code, version \\ nil, ancestor_code)
      when is_binary(ancestor_code) and byte_size(ancestor_code) > 0 do
    with {:ok, code_system} <- fetch_code_system(system, version),
         {:ok, descendant} <- fetch_active_concept(code_system.id, code),
         {:ok, ancestor} <- fetch_active_concept(code_system.id, ancestor_code) do
      closure_row =
        ConceptClosure
        |> Ash.Query.filter(parent_id == ^ancestor.id and child_id == ^descendant.id)
        |> Ash.read_one!(authorize?: false)

      {:ok, not is_nil(closure_row)}
    end
  end

  @spec resolve_display(String.t(), String.t(), String.t() | nil, String.t() | nil) ::
          {:ok, String.t()} | {:error, :code_system_not_found | :concept_not_found}
  def resolve_display(system, code, version \\ nil, locale \\ nil) do
    with {:ok, code_system} <- fetch_code_system(system, version),
         {:ok, concept} <- fetch_active_concept(code_system.id, code) do
      {:ok, resolve_designation(concept.id, locale)}
    end
  end

  defp fetch_code_system(system, version) do
    query =
      CodeSystem
      |> Ash.Query.filter(url == ^system)
      |> maybe_filter_version(version)
      |> Ash.Query.sort(version: :desc)
      |> Ash.Query.limit(1)

    case Ash.read!(query, authorize?: false) do
      [code_system | _] -> {:ok, code_system}
      [] -> {:error, :code_system_not_found}
    end
  end

  defp maybe_filter_version(query, nil), do: query
  defp maybe_filter_version(query, version), do: Ash.Query.filter(query, version == ^version)

  defp fetch_active_concept(code_system_id, code) do
    concept =
      Concept
      |> Ash.Query.filter(code_system_id == ^code_system_id and code == ^code and active == true)
      |> Ash.read_one!(authorize?: false)

    if is_nil(concept), do: {:error, :concept_not_found}, else: {:ok, concept}
  end

  defp validate_display(nil, _resolved_display), do: :ok
  defp validate_display(_display, nil), do: {:error, :display_mismatch}
  defp validate_display(display, resolved_display) when display == resolved_display, do: :ok
  defp validate_display(_display, _resolved_display), do: {:error, :display_mismatch}

  defp validate_closure_constraint(_system, _code, _version, nil), do: :ok
  defp validate_closure_constraint(_system, _code, _version, ""), do: :ok

  defp validate_closure_constraint(system, code, version, ancestor_code) do
    case code_in_closure?(system, code, version, ancestor_code) do
      {:ok, true} -> :ok
      {:ok, false} -> {:error, :not_in_closure}
      {:error, reason} -> {:error, reason}
    end
  end

  defp resolve_designation(concept_id, locale) do
    designations =
      Designation
      |> Ash.Query.filter(concept_id == ^concept_id)
      |> Ash.read!(authorize?: false)

    locale_candidates =
      locale
      |> locale_candidates()
      |> Enum.concat(["en"])
      |> Enum.uniq()

    exact_match =
      locale_candidates
      |> Enum.find_value(fn candidate ->
        Enum.find(designations, fn designation ->
          normalize_locale(designation.language) == candidate and designation.use in @preferred_use_order
        end)
      end)

    with nil <- exact_match do
      best_any_language_designation(designations)
    else
      designation -> designation.value
    end
  end

  defp best_any_language_designation([]), do: nil

  defp best_any_language_designation(designations) do
    sorted =
      Enum.sort_by(designations, fn designation ->
        {
          Enum.find_index(@preferred_use_order, &(&1 == designation.use)) || 999,
          normalize_locale(designation.language),
          designation.value
        }
      end)

    sorted |> List.first() |> then(& &1.value)
  end

  defp locale_candidates(nil), do: []

  defp locale_candidates(locale) do
    normalized = normalize_locale(locale)
    root = locale_root(normalized)

    [normalized, root]
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  defp normalize_locale(locale), do: locale |> String.downcase() |> String.trim()

  defp locale_root(locale) do
    case String.split(locale, "-", parts: 2) do
      [root, _rest] -> root
      [root] -> root
      _ -> nil
    end
  end
end
