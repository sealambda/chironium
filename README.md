# Chironium

To start your Phoenix server:

- Run `mix setup` to install and setup dependencies
- Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

## Terminology imports (LOINC and SNOMED CT)

Download and extract the release archives first:

- SNOMED CT International and extensions from [SNOMED CT Member Licensing and Distribution Service](https://mlds.ihtsdotools.org/).
- LOINC release files from [LOINC Downloads](https://loinc.org/downloads/).

Place the extracted folders under `tmp/` (or any local path). Example:

- `tmp/Loinc_2.82`
- `tmp/SnomedCT_InternationalRF2_PRODUCTION_20260301T120000Z`
- `tmp/SnomedCT_SpanishRelease-es_PRODUCTION_20260210T120000Z`

Run imports in this order:

1. Import LOINC:

   `mix terminology.import.loinc --path tmp/Loinc_2.82`

2. Import SNOMED CT International:

   `mix terminology.import.snomed --path tmp/SnomedCT_InternationalRF2_PRODUCTION_20260301T120000Z`

3. Import SNOMED CT Spanish extension (depends on the international import):

   `mix terminology.import.snomed_spanish --path tmp/SnomedCT_SpanishRelease-es_PRODUCTION_20260210T120000Z --base_version 20260301`

Use `--force` on LOINC/SNOMED international tasks to replace an existing imported version.
