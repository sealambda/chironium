defmodule Chironium.Cldr do
  @moduledoc """
  CLDR configuration for Chironium.

  Provides locale-aware formatting for numbers, dates, currencies, and more.
  """
  use Cldr,
    locales: ["en", "es"],
    default_locale: "en",
    # Providers must match your ex_cldr_* dependencies.
    providers: [
      # Required for ex_money/ash_money.
      Cldr.Number,
      # Provided by ex_cldr_calendars.
      Cldr.Calendar,
      # Provided by ex_cldr_dates_times.
      Cldr.DateTime,
      # Provided by ex_cldr_lists.
      Cldr.List,
      # Provided by ex_cldr_person_names.
      Cldr.PersonName,
      # Provided by ex_cldr_territories.
      Cldr.Territory,
      # Provided by ex_cldr_units.
      Cldr.Unit
    ]
end
