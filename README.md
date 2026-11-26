# Chironium

**Open-source practice management for health and wellness professionals.**

Personal trainers, nutritionists, and physicians use Chironium to follow the people they care for: profiles, measurements, conditions, plans, and progress in one place, on any screen.

[![PR validation](https://github.com/sealambda/chironium/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/sealambda/chironium/actions/workflows/pr-validation.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/detail-dark.webp">
  <img alt="A customer's clinical summary with anthropometric measurements, cycle tracking, pathologies, allergies, and supplements." src="docs/images/detail-light.webp">
</picture>

> [!NOTE]
> Chironium is pre-1.0 and under active development. Expect breaking changes to the data model and the GraphQL API between releases.

## Get Chironium

- **Hosted.** [Sealambda](https://sealambda.com) runs Chironium for practices that would rather not operate it themselves. Write to hello@sealambda.com.
- **Self-hosted.** The [self-hosting guide](docs/self-hosting.md) sets up Chironium, PostgreSQL, and automatic HTTPS with Docker Compose.
- **From source.** Follow the [development quick start](#development-quick-start).

## Features

- **Customer profiles and onboarding.** A guided multi-step wizard, contact details, and an activity feed of every clinical record.
- **Anthropometry.** Weight, height, and body circumferences, with BMI and waist-to-hip ratio calculated automatically.
- **Clinical history.** Conditions, allergies and intolerances, medications and supplements, with autocomplete over the SNOMED CT and LOINC releases you [import](docs/terminology.md).
- **Nutrition plans.** Calorie and macronutrient targets with live balance checks.
- **Menstrual cycle tracking,** questionnaires, clinical notes, goals, and tasks.
- **Care teams and subscriptions.** Assign practitioners to customers and track plan progress and renewals.
- **Multi-tenant organizations.** Each organization's data is isolated, with role-based permissions for its members.
- **Standards-based.** Records are modeled on HL7 FHIR resources and available through a GraphQL API. Chironium is not a FHIR server: it has no FHIR REST API yet.
- **Localized.** English and Spanish, with locale-aware dates and units.

## Not there yet

Chironium does not replace a full clinic suite. It has no appointment scheduling, invoicing or payments, file attachments, bulk import of existing customers, or PDF export. Records can be archived but not permanently erased. Email goes through [Resend](https://resend.com) only, and the published container image is built for amd64 only.

## Development quick start

You need [mise](https://mise.jdx.dev) (it installs the pinned Elixir, Erlang, Node.js, and pnpm versions), Docker for the database, and a C compiler for the native dependencies (`build-essential` on Debian and Ubuntu, the Xcode Command Line Tools on macOS).

```sh
mise install
docker compose up -d --wait   # PostgreSQL 18 with pgvector
mix setup                     # dependencies, database, frontend build
mix chironium.seed            # demo organization; prints an invite code
mix phx.server
```

Open [localhost:4000](http://localhost:4000), choose **Sign in as developer**, then **Join with invitation** and paste the invite code from the seed output. No Google credentials are needed in development.

If port 5432 is already taken, run `export PGPORT=5433` before the commands above.

## Email

`RESEND_API_KEY` turns email on. In development any value works, and mail goes to the local mailbox at [`/dev/mailbox`](http://localhost:4000/dev/mailbox) instead of being sent. Without the key, nothing is emailed: practitioners share invitations and questionnaires as links.

## Documentation

| Guide | Contents |
| --- | --- |
| [Contributing](CONTRIBUTING.md) | Development workflow, quality checks, and the Contributor License Agreement |
| [Self-hosting](docs/self-hosting.md) | Docker image, configuration reference, and production operations |
| [Clinical terminologies](docs/terminology.md) | Importing SNOMED CT and LOINC releases |
| [Security policy](SECURITY.md) | How to report a vulnerability |

In development, a GraphQL playground runs at [localhost:4000/gql/playground](http://localhost:4000/gql/playground).

## Built with

[Elixir](https://elixir-lang.org), [Phoenix](https://www.phoenixframework.org), and the [Ash Framework](https://ash-hq.org) on PostgreSQL, with Oban for background jobs and AshGraphql for the API. The frontend is React and TypeScript with Vite, Tailwind CSS, TanStack Router and Query, and Paraglide for translations.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started; you sign the [Contributor License Agreement](CLA.md) once, on your first pull request. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Copyright © 2026 Sealambda GmbH and the Chironium contributors. Chironium is licensed under the [GNU Affero General Public License v3.0 only](LICENSE): if you run a modified version as a network service, you must offer its source code to its users.

[Sealambda GmbH](https://sealambda.com) also offers commercially licensed editions for organizations that cannot meet the AGPL's terms; write to hello@sealambda.com.

The clinical terminologies that Chironium references, including SNOMED CT and LOINC, have their own licenses; see [NOTICE.md](NOTICE.md). "Chironium" and the Chironium logo are trademarks of Sealambda GmbH. You may say your software is based on Chironium, but not present a modified version as an official Sealambda release.

## Disclaimer

Chironium is a record-keeping and workflow tool. It does not provide medical advice and is not certified as a medical device. Organizations that deploy it are responsible for complying with the laws that apply to them, including data protection (such as the GDPR or HIPAA), medical device regulations (such as the EU MDR), and terminology licenses.
