# Contributing to Chironium

Thank you for considering a contribution. This page covers the legal and practical steps; the coding conventions live in `AGENTS.md`.

## Contributor License Agreement

Every contributor signs the [Individual Contributor License Agreement](CLA.md) once. It is adapted from the Apache Software Foundation ICLA and grants Sealambda GmbH the rights needed to distribute your work under the AGPL-3.0-only license and under commercial terms, while you keep full ownership of your contribution.

When you open your first pull request, the CLA Assistant bot asks you to sign. Post this exact sentence as a comment on the pull request:

> I have read the CLA Document and I hereby sign the CLA

The bot records the signature in the `cla-signatures` branch and re-checks it on every later pull request. Contributions made on behalf of a company need a Corporate CLA; email hello@sealambda.com before you start.

## Development setup

[mise](https://mise.jdx.dev) installs the toolchain versions pinned in `mise.toml`, and `compose.yaml` runs PostgreSQL 18 with pgvector, the same database CI uses.

```sh
mise install
docker compose up -d --wait
mix setup
mix chironium.seed      # demo organization; prints an invite code
mix phx.server
```

Open [localhost:4000](http://localhost:4000) and choose **Sign in as developer**. The development sign-in creates the user on first use, so any email address works; then choose **Join with invitation** and paste the invite code from the seed output.

- **Port conflicts.** If another PostgreSQL already uses port 5432, export `PGPORT` (for example `export PGPORT=5433`) in the shell where you run both `docker compose` and `mix`.
- **Google sign-in.** To test the real OAuth flow, copy `envs/.env.example` to `envs/.env` and fill in a Google OAuth client.
- **Package manager.** Use `pnpm` for all JavaScript tasks; never `npm` or `yarn`.
- **Development tools.** The GraphQL playground, LiveDashboard, Oban dashboard, and Ash admin are mounted at `/gql/playground`, `/dev/dashboard`, `/oban`, and `/admin`.

## Before you open a pull request

Run the same checks CI runs:

```sh
mix precommit          # compile with warnings as errors, format, test
pnpm assets:check      # Biome lint and format for the frontend
pnpm assets:typecheck
pnpm assets:test       # Vitest unit tests
pnpm assets:e2e        # Playwright end-to-end tests against the dev server
```

Keep pull requests focused on one change and describe the why in the description. Changes to Ash resources must include the generated migrations and resource snapshots (`mix ash.codegen`).

## Clinical terminologies

Chironium references LOINC, SNOMED CT, RxNorm and UCUM codes. Each terminology has its own license, summarised in [NOTICE.md](NOTICE.md). Do not add SNOMED CT release content (descriptions, relationships, reference sets) to the repository; the importers load it from local release files that each deployment obtains under its own license. Small numbers of codes for tests and generated sample data are acceptable.

## Security issues

Do not open a public issue for a vulnerability; follow the [security policy](SECURITY.md) instead.

## Code of conduct

Everyone taking part in the project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
