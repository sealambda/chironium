# Contributing to Chironium

Thank you for considering a contribution. This page covers the legal and practical steps; the coding conventions live in `AGENTS.md`.

## Contributor License Agreement

Every contributor signs the [Individual Contributor License Agreement](CLA.md) once. It is adapted from the Apache Software Foundation ICLA and grants Sealambda GmbH the rights needed to distribute your work under the AGPL-3.0-only license and under commercial terms, while you keep full ownership of your contribution.

When you open your first pull request, the CLA Assistant bot asks you to sign. Post this exact sentence as a comment on the pull request:

> I have read the CLA Document and I hereby sign the CLA

The bot records the signature in the `cla-signatures` branch and re-checks it on every later pull request. Contributions made on behalf of a company need a Corporate CLA; email hello@sealambda.com before you start.

## Development setup

Toolchain versions are pinned in `mise.toml`. With [mise](https://mise.jdx.dev) and PostgreSQL installed:

```sh
mise install
cp envs/.env.example envs/.env   # fill in Google OAuth credentials
mix setup
mix phx.server
```

Use `pnpm` for all JavaScript tasks; never `npm` or `yarn`.

## Before you open a pull request

Run the same checks CI runs:

```sh
mix precommit          # compile with warnings as errors, format, test
pnpm assets:check      # Biome lint and format for the frontend
pnpm assets:typecheck
```

Keep pull requests focused on one change and describe the why in the description. Changes to Ash resources must include the generated migrations and resource snapshots (`mix ash.codegen`).

## Clinical terminologies

Chironium references LOINC, SNOMED CT, RxNorm and UCUM codes. Each terminology has its own license, summarised in [NOTICE.md](NOTICE.md). Do not add SNOMED CT release content (descriptions, relationships, reference sets) to the repository; the importers load it from local release files that each deployment obtains under its own license. Small numbers of codes for tests and generated sample data are acceptable.

## Security issues

Do not open a public issue for a vulnerability. Email hello@sealambda.com with the details and we will respond as quickly as we can.
