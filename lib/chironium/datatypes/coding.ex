defmodule Chironium.Datatypes.Coding do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Coding

  TODO: Define some validations to ensure that the codes are valid.
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  alias Chironium.Terminology.Service

  require Logger

  defmodule DisplayCalculation do
    @moduledoc false
    use Ash.Resource.Calculation

    @impl true
    def load(_query, _opts, _context), do: [:system, :code, :version]

    @impl true
    def calculate(records, _opts, context) do
      locale =
        context |> extract_locale()

      Enum.map(records, fn record ->
        resolve_display(record, locale)
      end)
    end

    defp resolve_display(%{system: system, code: code, version: version}, locale)
         when is_binary(system) and is_binary(code) do
      case Service.resolve_display(system, code, version, locale) do
        {:ok, display} ->
          display

        {:error, reason} ->
          Logger.warning(
            "Failed to resolve display for #{system}/#{code}/#{version} with locale #{locale}: #{reason}"
          )

          nil
      end
    end

    defp resolve_display(_record, _locale), do: nil

    defp extract_locale(%{arguments: %{locale: locale}}) when is_binary(locale), do: locale

    # TODO Can we extract the locale from the context/connection at all?
    defp extract_locale(_context), do: nil
  end

  graphql do
    type :coding
  end

  attributes do
    attribute :system, :string do
      public? true
      allow_nil? false
    end

    attribute :version, :string do
      public? true
    end

    attribute :code, :string do
      public? true
      allow_nil? false
    end

    attribute :user_selected, :boolean do
      public? true
    end
  end

  calculations do
    calculate :display, :string, DisplayCalculation do
      argument :locale, :string, default: nil
      public? true
      allow_nil? true
    end
  end
end
