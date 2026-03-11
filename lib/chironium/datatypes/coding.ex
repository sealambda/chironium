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

  defmodule DisplayCalculation do
    @moduledoc false
    use Ash.Resource.Calculation

    @impl true
    def load(_query, _opts, _context), do: [:system, :code, :version]

    @impl true
    def calculate(records, _opts, _context) do
      Enum.map(records, fn record ->
        resolve_display(record)
      end)
    end

    defp resolve_display(%{system: system, code: code, version: version})
         when is_binary(system) and is_binary(code) do
      case Service.resolve_display(system, code, version) do
        {:ok, display} -> display
        {:error, _reason} -> nil
      end
    end

    defp resolve_display(_record), do: nil
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
      public? true
      allow_nil? true
    end
  end
end
