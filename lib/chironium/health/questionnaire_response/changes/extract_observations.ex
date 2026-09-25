defmodule Chironium.Health.QuestionnaireResponse.Changes.ExtractObservations do
  @moduledoc """
  SDC-style observation extraction.

  When a response reaches `:completed`, walk its answer tree and turn coded answers into
  `Observation`s. Codes the app understands route to the typed `log_*` actions (so the
  values land in the anthropometry/cycle cards); other coded answers become a generic
  observation; uncoded answers are left in the response only.

  Extraction is idempotent: prior observations linked to this response are removed first,
  so re-completing or amending re-derives a clean set. It is also best-effort — a single
  unmappable answer is logged and skipped rather than failing the whole save.
  """

  use Ash.Resource.Change

  require Ash.Query
  require Logger

  alias Chironium.Health.Observation
  alias Chironium.Health.Questionnaire
  alias Chironium.Health.QuestionnaireResponse.ObservationExtractionMap

  @impl Ash.Resource.Change
  def change(changeset, _opts, context) do
    Ash.Changeset.after_action(changeset, &extract(&1, &2, context.actor))
  end

  # The actor is passed through so the audit trail attributes the observations.
  defp extract(changeset, %{status: :completed} = response, actor) do
    opts = [tenant: changeset.tenant, actor: actor, authorize?: false]

    case Ash.get(Questionnaire, response.questionnaire_id, opts) do
      {:ok, questionnaire} ->
        index = index_questions(questionnaire.item || [])
        delete_previous(response, opts)
        walk(response.item || [], index, response, opts)

      {:error, reason} ->
        Logger.warning(
          "[QuestionnaireResponse] extraction skipped, questionnaire load failed: #{inspect(reason)}"
        )
    end

    {:ok, response}
  end

  defp extract(_changeset, response, _actor), do: {:ok, response}

  defp index_questions(items) do
    Enum.reduce(items, %{}, fn item, acc ->
      acc
      |> Map.put(item["linkId"], item)
      |> Map.merge(index_questions(item["item"] || []))
    end)
  end

  defp delete_previous(response, opts) do
    Observation
    |> Ash.Query.filter(derived_from_response_id == ^response.id)
    |> Ash.read(opts)
    |> case do
      {:ok, observations} ->
        Enum.each(observations, &safe_destroy(&1, opts))

      {:error, reason} ->
        Logger.warning(
          "[QuestionnaireResponse] could not clear prior observations: #{inspect(reason)}"
        )
    end
  end

  defp safe_destroy(observation, opts) do
    case Ash.destroy(observation, opts) do
      :ok ->
        :ok

      {:ok, _} ->
        :ok

      {:error, reason} ->
        Logger.warning(
          "[QuestionnaireResponse] could not archive prior observation: #{inspect(reason)}"
        )
    end
  end

  defp walk(nodes, index, response, opts) do
    Enum.each(nodes, fn node ->
      question = Map.get(index, node["linkId"])
      answers = node["answer"] || []

      if question, do: Enum.each(answers, &extract_answer(question, &1, response, opts))

      walk(node["item"] || [], index, response, opts)
    end)
  end

  defp extract_answer(question, answer, response, opts) do
    codings = question["code"] || []

    case first_mapped(codings) do
      {_coding, descriptor} -> create_typed(descriptor, answer, response, opts)
      nil -> create_generic(codings, answer, response, opts)
    end
  end

  defp first_mapped(codings) do
    Enum.find_value(codings, fn coding ->
      case ObservationExtractionMap.lookup(coding["system"], coding["code"]) do
        nil -> nil
        descriptor -> {coding, descriptor}
      end
    end)
  end

  # Route to a typed `log_*` action so the value lands in the matching card.
  defp create_typed(%{action: action, kind: :date}, answer, response, opts) do
    case to_datetime(answer["valueDate"] || answer["valueDateTime"]) do
      nil ->
        :skip

      datetime ->
        run(
          action,
          %{subject_id: response.subject_id, effective_date_time: datetime},
          response,
          opts
        )
    end
  end

  defp create_typed(%{action: action, kind: :string}, answer, response, opts) do
    case to_string_value(answer) do
      nil -> :skip
      value -> run(action, base_args(response, %{value_string: value}), response, opts)
    end
  end

  defp create_typed(%{action: action, kind: kind, key: key}, answer, response, opts)
       when kind in [:number, :integer] do
    case to_number(answer) do
      nil ->
        :skip

      number ->
        value = if kind == :integer, do: round(number), else: number
        run(action, base_args(response, %{key => value}), response, opts)
    end
  end

  # No mapped code: a generic Observation that carries the question's code verbatim.
  defp create_generic([], _answer, _response, _opts), do: :skip

  defp create_generic([_ | _] = codings, answer, response, opts) do
    case generic_value(answer) do
      nil ->
        :skip

      value_attrs ->
        args =
          response
          |> base_args(value_attrs)
          |> Map.put(:code, %{coding: codings})
          |> Map.put(:status, :final)

        run(:create, args, response, opts)
    end
  end

  defp base_args(response, extra) do
    Map.merge(%{subject_id: response.subject_id, effective_date_time: response.authored}, extra)
  end

  defp run(action, args, response, opts) do
    Observation
    |> Ash.Changeset.for_create(action, args, opts)
    |> Ash.Changeset.force_change_attribute(:derived_from_response_id, response.id)
    |> Ash.create()
    |> case do
      {:ok, _observation} ->
        :ok

      {:error, reason} ->
        Logger.warning(
          "[QuestionnaireResponse] observation extraction failed for #{inspect(action)}: #{inspect(reason)}"
        )
    end
  end

  # Exactly one `value[x]` for the generic Observation.
  defp generic_value(%{"valueQuantity" => quantity}) when is_map(quantity),
    do: %{value_quantity: quantity}

  defp generic_value(%{"valueCoding" => coding}) when is_map(coding),
    do: %{value_codeable_concept: %{coding: [coding]}}

  defp generic_value(answer) do
    cond do
      datetime = to_datetime(answer["valueDateTime"] || answer["valueDate"]) ->
        %{value_date_time: datetime}

      number = to_plain_number(answer["valueDecimal"] || answer["valueInteger"]) ->
        %{value_quantity: %{value: number}}

      string = to_string_value(answer) ->
        %{value_string: string}

      is_boolean(answer["valueBoolean"]) ->
        %{value_string: to_string(answer["valueBoolean"])}

      true ->
        nil
    end
  end

  defp to_number(%{"valueQuantity" => %{"value" => value}}), do: to_plain_number(value)

  defp to_number(answer),
    do:
      to_plain_number(answer["valueDecimal"] || answer["valueInteger"] || answer["valueQuantity"])

  defp to_plain_number(value) when is_number(value), do: value
  defp to_plain_number(%Decimal{} = value), do: Decimal.to_float(value)

  defp to_plain_number(value) when is_binary(value) do
    case Float.parse(value) do
      {number, _} -> number
      :error -> nil
    end
  end

  defp to_plain_number(_), do: nil

  defp to_string_value(%{"valueString" => value}) when is_binary(value), do: value

  defp to_string_value(%{"valueCoding" => %{"display" => display}}) when is_binary(display),
    do: display

  defp to_string_value(_), do: nil

  defp to_datetime(nil), do: nil

  defp to_datetime(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, datetime, _offset} ->
        datetime

      _ ->
        case Date.from_iso8601(value) do
          {:ok, date} -> DateTime.new!(date, ~T[00:00:00], "Etc/UTC")
          _ -> nil
        end
    end
  end

  defp to_datetime(_), do: nil
end
