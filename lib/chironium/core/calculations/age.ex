defmodule Chironium.Core.Calculations.Age do
  @moduledoc """
  Calculates the age of a user based on their birth date.

  Returns `nil` if the birth date is not set.
  """
  use Ash.Resource.Calculation

  @impl true
  def load(_query, _opts, _context) do
    [:birth_date]
  end

  @impl true
  def calculate(records, _opts, _context) do
    today = Date.utc_today()

    Enum.map(records, fn record ->
      calculate_age(record.birth_date, today)
    end)
  end

  defp calculate_age(nil, _today), do: nil

  defp calculate_age(birth_date, today) do
    age = today.year - birth_date.year
    birthday_this_year = %{birth_date | year: today.year}

    if Date.compare(today, birthday_this_year) in [:eq, :gt] do
      age
    else
      age - 1
    end
  end
end
