defmodule Chironium.Cldr do
  use Cldr,
    locales: ["en", "es"],
    default_locale: "en",
    # Providers must match your ex_cldr_* dependencies.
    providers: [
      Cldr.Number,      # Required for ex_money/ash_money.
      Cldr.Calendar,    # Provided by ex_cldr_calendars.
      Cldr.DateTime,    # Provided by ex_cldr_dates_times.
      Cldr.List,        # Provided by ex_cldr_lists.
      Cldr.PersonName,  # Provided by ex_cldr_person_names.
      Cldr.Territory,   # Provided by ex_cldr_territories.
      Cldr.Unit         # Provided by ex_cldr_units.
    ]
end
