# Chironium

Chironium is an open-source platform for health and wellness professionals, from personal trainers and nutritionists to physicians, to follow the people they care for. It covers person profiles and onboarding, anthropometric measurements and other observations, conditions, allergies, medications and supplements, nutrition plans, menstrual cycle tracking, questionnaires, tasks and reminders, care teams, and subscriptions. Organizations are isolated tenants, the data model follows HL7 FHIR, and everything is available through a GraphQL API.

Chironium is built and maintained by [Sealambda GmbH](https://sealambda.com), a software company based in Switzerland, and released under the GNU Affero General Public License v3.0. Sealambda also offers hosted and commercially licensed editions; write to hello@sealambda.com.

## Stack

- Backend: Elixir, Phoenix, the [Ash Framework](https://ash-hq.org), PostgreSQL with pgvector, Oban for background jobs, Absinthe and AshGraphql for the API, AshAuthentication with Google sign-in.
- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Router and Query, Paraglide for i18n (English and Spanish).
- Tooling: `mise` pins the toolchain, `pnpm` manages JavaScript packages, Biome lints and formats the frontend, Playwright runs end-to-end tests.

## Getting started

Install the toolchain from `mise.toml` and start a local PostgreSQL, then:

```sh
mise install
cp envs/.env.example envs/.env   # fill in Google OAuth credentials
mix setup                        # deps, database, seeds, frontend build
mix phx.server                   # or: iex -S mix phx.server
```

Visit [`localhost:4000`](http://localhost:4000). See [CONTRIBUTING.md](CONTRIBUTING.md) for the quality checks that run in CI.

## Email

`RESEND_API_KEY` turns email on. In development any value works, and mail goes to the local mailbox at [`/dev/mailbox`](http://localhost:4000/dev/mailbox) instead of being sent. Without the key, nothing is emailed: practitioners share invitations and questionnaires as links.

## Terminology imports (LOINC and SNOMED CT)

Chironium does not ship LOINC or SNOMED CT release content. Each deployment obtains the release files under its own license (see [NOTICE.md](NOTICE.md)) and imports them locally.

Download and extract the release archives first:

- SNOMED CT International and extensions from the [SNOMED CT Member Licensing and Distribution Service](https://mlds.ihtsdotools.org/).
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

## License

Copyright © 2026 Sealambda GmbH and the Chironium contributors.

Chironium is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3 of the License only. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [LICENSE](LICENSE) for the full text.

If you run a modified version of Chironium as a network service, the AGPL requires you to offer its source code to your users. Organizations that cannot meet the AGPL's terms can obtain a commercial license from Sealambda at hello@sealambda.com.

Contributions are welcome and require signing the [Contributor License Agreement](CLA.md) once; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Clinical terminologies

The source code references codes from LOINC, SNOMED CT, RxNorm, ICD-10-CM and UCUM. These terminologies are not covered by the AGPL; each has its own license, and SNOMED CT in particular requires every deploying organization to hold a SNOMED CT Affiliate License. [NOTICE.md](NOTICE.md) lists the terms and the required notices.

## Trademarks

"Chironium" and the Chironium logo are trademarks of Sealambda GmbH. The AGPL does not grant trademark rights. You may state that your software is based on Chironium, but you may not use the name or logo for a modified version in a way that suggests it is an official Sealambda release.

## Disclaimer

Chironium is a record-keeping and workflow tool for professionals. It does not provide medical advice, and Sealambda makes no claim of conformity with medical device regulations. Organizations deploying Chironium are responsible for compliance with the laws that apply to them, including data protection (such as GDPR or HIPAA), medical device rules (such as the EU MDR), and terminology licenses.
