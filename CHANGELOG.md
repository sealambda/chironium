# Changelog

All notable changes to Chironium are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Chironium is pre-1.0, so minor versions may contain breaking changes; each release lists them under **Changed**.

## [Unreleased]

### Added

- A Docker Compose setup in `deploy/` that runs Chironium with PostgreSQL and, optionally, Caddy for automatic HTTPS.

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

[Unreleased]: https://github.com/sealambda/chironium/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sealambda/chironium/releases/tag/v0.1.0
