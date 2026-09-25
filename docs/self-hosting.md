# Self-Hosting

Chironium ships as a single container image that serves the web app, the GraphQL API, and background jobs. You provide PostgreSQL, a Google OAuth client for sign-in, and a reverse proxy that terminates TLS.

## Requirements

- **PostgreSQL 18 with the [pgvector](https://github.com/pgvector/pgvector) extension.** This is the version CI tests against; the `pgvector/pgvector:pg18` image works out of the box.
- **A Google OAuth client.** Google is the only sign-in method in production. Create a web client in the [Google Cloud console](https://console.cloud.google.com/apis/credentials) with the redirect URI `https://<your host>/auth/user/google/callback`.
- **A TLS-terminating reverse proxy.** The app listens on plain HTTP and generates `https://` URLs on port 443 for the host in `PHX_HOST`.

## Run the container

Every push to `main` publishes `ghcr.io/sealambda/chironium:main`. To build the image yourself, run `docker build -t chironium .` from the repository root.

```sh
docker run -d --name chironium -p 4000:4000 \
  -e PHX_HOST=chironium.example.com \
  -e DATABASE_URL=ecto://chironium:password@db.example.com/chironium \
  -e SECRET_KEY_BASE="$(openssl rand -base64 48)" \
  -e TOKEN_SIGNING_SECRET="$(openssl rand -base64 48)" \
  -e GOOGLE_CLIENT_ID=... \
  -e GOOGLE_CLIENT_SECRET=... \
  ghcr.io/sealambda/chironium:main
```

Generate `SECRET_KEY_BASE` and `TOKEN_SIGNING_SECRET` once and keep them stable: changing them signs everyone out.

The container's entrypoint, `bin/server`, runs all pending migrations before it starts, so upgrading means pulling a newer image and restarting the container.

After the first start, sign in with Google and choose **Create New Organization**. Invite colleagues from the organization settings.

## Configuration

### Required

| Variable | Description |
| --- | --- |
| `PHX_HOST` | Public hostname, without scheme or port. |
| `SECRET_KEY_BASE` | Signs and encrypts session cookies. At least 64 characters. |
| `TOKEN_SIGNING_SECRET` | Signs authentication tokens. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |

### Database

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | Unix socket | Connection URL, for example `ecto://USER:PASSWORD@HOST/DATABASE`. Without it, Chironium connects through `/var/run/postgresql` as the `chironium` user to the `chironium` database. |
| `POOL_SIZE` | `10` | Database connections per node. |
| `ECTO_IPV6` | unset | Set to `true` to connect to the database over IPv6. |

### Email

Chironium sends invitations and notifications through [Resend](https://resend.com).

| Variable | Default | Description |
| --- | --- | --- |
| `RESEND_API_KEY` | unset | Resend API key. Without it, no email is delivered. |
| `EMAIL_FROM_ADDRESS` | Sealambda's sender | Sender address. Set it to an address on a domain you have verified with Resend. |
| `EMAIL_FROM_NAME` | `Chironium` | Sender display name. |

### Optional

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port inside the container. |
| `GOOGLE_REDIRECT_URI` | `https://<PHX_HOST>/auth/user/google/callback` | Override the OAuth redirect URI. |
| `SOURCE_CODE_URL` | This repository | Where the "Source code" links point. If you deploy a modified version, the AGPL requires this to lead to your modified source. |
| `TERMS_URL`, `PRIVACY_URL` | unset | Your terms of service and privacy policy. The sign-in page links to them only when both are set. |
| `ALLOWED_APP_ORIGINS` | unset | Comma-separated origins trusted for redirects after sign-in. Only needed when the frontend is served from a different origin. |
| `DNS_CLUSTER_QUERY` | unset | DNS name that resolves to all nodes, to cluster several instances. |
| `POSTHOG_API_KEY` | unset | Enables [PostHog](https://posthog.com) analytics and error tracking. See [Analytics](#analytics). |
| `POSTHOG_HOST` | `https://eu.i.posthog.com` | PostHog ingestion host. |

## Analytics

Chironium sends nothing to third parties unless you set `POSTHOG_API_KEY`. When you do:

- The browser reports page views and interactions, and identifies each signed-in practitioner by user ID, email address, and name.
- Autocapture and session recordings mask all on-screen text, element attributes, and form inputs, so patient data shown in the interface is never collected.
- The server reports unhandled errors with stack traces. Error messages can include record values, so treat your PostHog project as holding health data.

Use your own PostHog project, and review your data processing agreements before enabling it.

## Operations

Run one-off tasks through the release binary inside the container:

```sh
docker exec chironium bin/migrate                                               # run migrations without restarting
docker exec chironium bin/chironium eval 'Chironium.Release.import_loinc("/data/Loinc_2.82")'
```

[Clinical terminologies](terminology.md) covers the terminology imports. `bin/seed` fills an organization with generated demo data; never run it against a database with real records.

Back up the database with your usual PostgreSQL tooling, such as `pg_dump`. All application state lives there.
