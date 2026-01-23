defmodule Chironium.Core.Calculations.FullName do
  @moduledoc """
  Calculates the full name by joining name and surname parts.

  Uses `given_name`, `st_surname`, and `nd_surname` from Person resource.
  Returns an empty string if no name parts are set.
  """
  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [:given_name, :st_surname, :nd_surname]
  end

  @impl true
  def calculate(records, _opts, _context) do
    Enum.map(records, fn record ->
      [record.given_name, record.st_surname, record.nd_surname]
      |> Enum.reject(&(is_nil(&1) or &1 == ""))
      |> Enum.join(" ")
    end)
  end
end
