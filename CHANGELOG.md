# Changelog

All notable changes to Chironium are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Chironium is pre-1.0, so minor versions may contain breaking changes; each release lists them under **Changed**.

## [Unreleased]

## [0.3.0] - 2026-10-26

### Added

- Demo mode (`DEMO_MODE=true`) for running a public demo: visitors start a private organization with generated data in one click, and it is deleted after 24 hours. See the [self-hosting guide](docs/self-hosting.md#optional).
- The organization timezone list is searchable.

### Changed

- Each list page shows its title and add button on one row; the top bar no longer holds page actions.

### Fixed

- BMI and waist-to-hip ratio are created when weight, height, or circumferences are saved together, and update when those measurements are edited.
- Coded food preferences show every label.
- Signing in and out keeps the visitor's language.

### Security

- Updated ash, ash_postgres, and plug_crypto to fix EEF-CVE-2026-96581, EEF-CVE-2026-114214, EEF-CVE-2026-115627, EEF-CVE-2026-115635, and CVE-2026-105963.

## [0.2.0] - 2026-10-24

### Added

- A Docker Compose setup in `deploy/` that runs Chironium with PostgreSQL and, optionally, Caddy for automatic HTTPS.
- Sign-in with an emailed link, and with any OpenID Connect provider such as Keycloak or Authentik. Every method reaches the same account for the same email address.

### Changed

- Google sign-in is optional. Production needs at least one sign-in method: email (`RESEND_API_KEY`), Google, or OpenID Connect. See the [self-hosting guide](docs/self-hosting.md#sign-in).
- Google and OpenID Connect sign-ins are refused unless the provider has verified the email address.

### Fixed

- Production boots no longer log "Could not warm up static assets".

## [0.1.0] - 2026-10-23

The first public release.

### Added

- Customer profiles with a guided multi-step onboarding wizard, contact details, and an activity feed of every clinical record.
- Anthropometry: weight, height, and body circumferences, with BMI and waist-to-hip ratio calculated automatically.
- Clinical history: conditions, allergies and intolerances, medications and supplements, coded with SNOMED CT, LOINC, and RxNorm.
- Nutrition plans with calorie and macronutrient targets and live balance checks.
- Menstrual cycle tracking, questionnaires (with answers mapped to measurements), clinical notes, goals, and tasks.
- Care teams and subscriptions to assign practitioners to customers and track plan progress and renewals.
- Multi-tenant organizations with isolated data and role-based permissions.
- An HL7 FHIR-based data model, exposed through a GraphQL API.
- English and Spanish interfaces with locale-aware dates and units.
- A container image on GitHub Container Registry and a [self-hosting guide](docs/self-hosting.md).

[Unreleased]: https://github.com/sealambda/chironium/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/sealambda/chironium/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/sealambda/chironium/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sealambda/chironium/releases/tag/v0.1.0
