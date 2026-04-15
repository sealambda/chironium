defmodule Chironium.Health.Preparations.FilterByRequestedPeriodWindow do
  @moduledoc """
  Filters tasks whose requested_period.start falls within the next 24 hours.
  """

  use Ash.Resource.Preparation

  require Ash.Query

  @impl true
  def prepare(query, _opts, _context) do
    now = DateTime.utc_now()
    window_end = DateTime.add(now, 24, :hour)

    Ash.Query.filter(
      query,
      fragment("(?->>'start')::timestamptz >= ?", requested_period, ^now) and
        fragment("(?->>'start')::timestamptz <= ?", requested_period, ^window_end)
    )
  end
end
