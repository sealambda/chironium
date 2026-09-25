# Clinical Terminologies

Chironium codes conditions, observations, and medications with LOINC and SNOMED CT, and offers autocomplete over their concepts. It does not ship their release content: each deployment obtains the release files under its own license and imports them into its database. [NOTICE.md](../NOTICE.md) summarizes the license terms; SNOMED CT in particular requires every deploying organization to hold an Affiliate License.

## Download the releases

- **SNOMED CT** International Edition and national extensions, from the [Member Licensing and Distribution Service](https://mlds.ihtsdotools.org/).
- **LOINC**, from [LOINC Downloads](https://loinc.org/downloads/).

Extract the archives to a local directory, for example:

```text
tmp/Loinc_2.82
tmp/SnomedCT_InternationalRF2_PRODUCTION_20260301T120000Z
tmp/SnomedCT_SpanishRelease-es_PRODUCTION_20260210T120000Z
```

`tmp/` is ignored by Git, so release files placed there are never committed.

## Import in development

Run the imports in this order; the Spanish extension builds on the International Edition.

```sh
mix terminology.import.loinc --path tmp/Loinc_2.82
mix terminology.import.snomed --path tmp/SnomedCT_InternationalRF2_PRODUCTION_20260301T120000Z
mix terminology.import.snomed_spanish \
  --path tmp/SnomedCT_SpanishRelease-es_PRODUCTION_20260210T120000Z \
  --base_version 20260301
```

Pass `--force` to the LOINC or SNOMED CT International import to replace a version that is already imported.

## Import in production

Releases have no Mix, so call the same importers through the release binary. Mount the extracted files into the container, then run:

```sh
bin/chironium eval 'Chironium.Release.import_loinc("/data/Loinc_2.82")'
bin/chironium eval 'Chironium.Release.import_snomed("/data/SnomedCT_InternationalRF2_PRODUCTION_20260301T120000Z")'
bin/chironium eval 'Chironium.Release.import_snomed_spanish("/data/SnomedCT_SpanishRelease-es_PRODUCTION_20260210T120000Z", base_version: "20260301")'
```

The functions accept the same options as the Mix tasks as a keyword list, for example `force: true`.
