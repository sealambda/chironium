defmodule Chironium.Core.Calculations.FamilyName do
  @moduledoc """
  Calculates the family name by joining surname parts (OIDC: family_name).

  Uses `st_surname` and `nd_surname` from Person resource.
  Returns an empty string if no surname parts are set.
  """
  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [:st_surname, :nd_surname]
  end

  @impl true
  def calculate(records, _opts, _context) do
    Enum.map(records, fn record ->
      [record.st_surname, record.nd_surname]
      |> Enum.reject(&(is_nil(&1) or &1 == ""))
      |> Enum.join(" ")
    end)
  end
end
