---
applyTo: "**"
---
# Commit Scope Standards

## Overview

This document defines the standardized scopes to use in Conventional Commits for the Chironium project. Scopes provide context about which part of the codebase is affected by a commit.

## Scope Format

```
<type>(<scope>): <Infinitive Verb> <description> in <relative-path>
```

## Primary Scope Keywords

### Frontend Scopes

#### `(client)`

**Use for:** All files within the `client/` directory, regardless of subdirectory.

**Examples:**

- `feat(client): Add Button component in client/src/components/ui/button.tsx`
- `feat(client): Add utility functions in client/src/lib/utils.ts`
- `style(client): Add global styles in client/src/index.css`
- `chore(client): Add TypeScript config in client/tsconfig.json`
- `chore(client): Add pnpm lock file in client/pnpm-lock.yaml`

**Rationale:** Unified scope makes it clear the change belongs to the frontend application, simplifying history filtering and changelogs.

### Backend Scopes

#### `(web)`

**Use for:** Backend web layer files in `lib/chironium_web/`.

**Examples:**

- `feat(web): Add endpoint configuration in lib/chironium_web/endpoint.ex`
- `feat(web): Add page controller in lib/chironium_web/controllers/page_controller.ex`
- `feat(web): Add core components in lib/chironium_web/components/core_components.ex`
- `feat(web): Add error JSON view in lib/chironium_web/controllers/error_json.ex`

**Rationale:** Distinguishes backend Phoenix web layer from frontend client code.

#### `(auth)`

**Use for:** Authentication and authorization code.

**Examples:**

- `feat(auth): Add User resource in lib/chironium/accounts/user.ex`
- `feat(auth): Add Token resource in lib/chironium/accounts/token.ex`
- `feat(auth): Add LiveView authentication helpers in lib/chironium_web/live_user_auth.ex`
- `feat(auth): Add magic link email sender in lib/chironium/accounts/user/senders/send_magic_link_email.ex`
- `feat(auth): Add users and tokens tables in priv/repo/migrations/...`

#### `(accounts)`

**Use for:** Accounts domain logic (broader than auth).

**Examples:**

- `feat(accounts): Add Accounts domain in lib/chironium/accounts.ex`

#### `(api)`

**Use for:** API-specific code (JSON:API, GraphQL endpoints, RPC).

**Examples:**

- `feat(api): Add JSON:API router in lib/chironium_web/ash_json_api_router.ex`
- `feat(api): Add AshTypescript RPC controller in lib/chironium_web/controllers/ash_typescript_rpc_controller.ex`

#### `(graphql)`

**Use for:** GraphQL schema, resolvers, and related code.

**Examples:**

- `feat(graphql): Add GraphQL schema definition in lib/chironium_web/graphql_schema.ex`
- `feat(graphql): Add GraphQL WebSocket handler in lib/chironium_web/graphql_socket.ex`

#### `(router)`

**Use for:** Routing configuration.

**Examples:**

- `feat(router): Add Phoenix router configuration in lib/chironium_web/router.ex`

#### `(layout)`

**Use for:** Layout templates and modules.

**Examples:**

- `feat(layout): Add layouts module in lib/chironium_web/components/layouts.ex`
- `feat(layout): Add root layout template in lib/chironium_web/components/layouts/root.html.heex`

#### `(db)`

**Use for:** Database migrations, seeds, snapshots, and repository code.

**Examples:**

- `feat(db): Add database extensions and money operators in priv/repo/migrations/...`
- `feat(db): Add database seeds script in priv/repo/seeds.exs`
- `feat(db): Add Ash resource extensions snapshot in priv/resource_snapshots/repo/extensions.json`
- `feat: Add database repository in lib/chironium/repo.ex`

#### `(i18n)`

**Use for:** Internationalization files and configuration.

**Examples:**

- `feat(i18n): Add Gettext backend module in lib/chironium_web/gettext.ex`
- `feat(i18n): Add error messages template in priv/gettext/errors.pot`
- `feat(i18n): Add English error translations in priv/gettext/en/LC_MESSAGES/errors.po`
- `feat(i18n): Add CLDR configuration in lib/chironium/cldr.ex`

#### `(telemetry)`

**Use for:** Telemetry and metrics configuration.

**Examples:**

- `feat(telemetry): Add telemetry metrics configuration in lib/chironium_web/telemetry.ex`

#### `(background)`

**Use for:** Background jobs, workers, Oban configuration.

**Examples:**

- `feat(background): Add Oban job queue migration in priv/repo/migrations/20260118184643_add_oban.exs`

### Shared Scopes

#### `(assets)`

**Use for:** Static assets, vendor files, logos, favicons.

**Examples:**

- `feat(assets): Add favicon in priv/static/favicon.ico`
- `feat(assets): Add Phoenix logo in priv/static/images/logo.svg`
- `feat(assets): Add frontend assets configuration in assets/`

**Note:** For client-specific assets, use `(client)`:

- `feat(client): Add React logo in client/src/assets/react.svg`
- `feat(client): Add Vite logo in client/public/vite.svg`

#### `(config)`

**Use for:** Application configuration files in `config/`.

**Examples:**

- `chore(config): Add main application config in config/config.exs`
- `chore(config): Add development config in config/dev.exs`
- `chore(config): Add production config in config/prod.exs`
- `chore(config): Add runtime config in config/runtime.exs`
- `chore(config): Add test config in config/test.exs`

#### `(seo)`

**Use for:** SEO-related files.

**Examples:**

- `feat(seo): Add robots.txt configuration in priv/static/robots.txt`

### Project-Level Scopes

#### No scope (root-level)

**Use for:** Root-level project files that don't fit other categories.

**Examples:**

- `build: Add project dependencies and configuration in mix.exs`
- `build: Add dependency lock file in mix.lock`
- `chore: Add Elixir formatter configuration in .formatter.exs`
- `chore: Add Git ignore rules in .gitignore`
- `chore: Add Igniter configuration in .igniter.exs`
- `docs: Add project README in README.md`
- `docs: Add Phoenix agent usage guidelines in AGENTS.md`
- `chore: Add GitHub configuration and instructions in .github/`

#### `test`

**Use for:** Test files and test infrastructure.

**Examples:**

- `test: Add test helper configuration in test/test_helper.exs`
- `test: Add DataCase test support module in test/support/data_case.ex`
- `test: Add ConnCase test support module in test/support/conn_case.ex`
- `test: Add ErrorHTML tests in test/chironium_web/controllers/error_html_test.exs`

**Note:** No scope needed for test type since the type itself is `test`.

## Scope Selection Guidelines

### Decision Tree

1. **Is it in `client/`?**
   - Yes → Use `(client)`
   - No → Continue

2. **Is it in `lib/chironium_web/`?**
   - Yes → Use `(web)` (or more specific like `(auth)`, `(layout)`, `(router)` if applicable)
   - No → Continue

3. **Is it authentication/authorization related?**
   - Yes → Use `(auth)`
   - No → Continue

4. **Is it in `config/`?**
   - Yes → Use `(config)`
   - No → Continue

5. **Is it database-related** (`priv/repo/`, migrations, seeds)?
   - Yes → Use `(db)`
   - No → Continue

6. **Is it i18n-related?**
   - Yes → Use `(i18n)`
   - No → Continue

7. **Is it a test file?**
   - Yes → Use type `test` with no scope
   - No → Continue

8. **Is it a root-level config file** (`.formatter.exs`, `.gitignore`, `mix.exs`, etc.)?
   - Yes → No scope needed, use appropriate type (`build`, `chore`, `docs`)
   - No → Continue

9. **Use domain-specific scope** based on file location and purpose.

### Domain-Specific Scopes

For files in `lib/chironium/`:

- Use the module/domain name as scope: `(accounts)`, `(billing)`, `(analytics)`, etc.
- Example: `feat(accounts): Add Accounts domain in lib/chironium/accounts.ex`

### Avoid Over-Scoping

- Don't create scopes for single files.
- Don't use nested scopes like `(client/ui)` - just use `(client)`.
- Don't use file extensions as scopes - `(tsx)`, `(exs)` are invalid.

## Special Cases

### Multi-Purpose Files

If a file serves multiple purposes, choose the **most specific applicable scope**:

- `lib/chironium_web/live_user_auth.ex` → `(auth)` (not `(web)`) because auth is more specific

### Vendor/Third-Party Code

Use `(assets)` or appropriate location-based scope:

- `assets/vendor/topbar.js` → `feat(assets): Add frontend assets configuration in assets/`

### Generated Files

If committing generated files, use the scope of what generated them:

- Generated TypeScript from Ash → `feat(client): Add generated Ash TypeScript hooks in client/src/lib/ash.ts`

## Consistency Rules

1. **Same directory = same scope**: All files in `client/` use `(client)`, regardless of subdirectory depth.

2. **Specificity wins**: If both `(web)` and `(auth)` apply, use the more specific `(auth)`.

3. **No scope duplication**: Don't put scope info in the description:
   - ❌ `feat(client): Add client button component`
   - ✅ `feat(client): Add Button component in client/src/components/ui/button.tsx`

4. **Scope matches intent, not just location**:
   - A migration adding auth tables → `(auth)`, not `(db)`
   - A migration adding DB extensions → `(db)`

## Summary

| Scope          | Use For                                  | Examples                                           |
| -------------- | ---------------------------------------- | -------------------------------------------------- |
| `(client)`     | All `client/` files                      | UI components, styles, configs, assets             |
| `(web)`        | Backend web layer (`lib/chironium_web/`) | Endpoints, controllers, views, templates           |
| `(auth)`       | Authentication/authorization             | User/token resources, auth controllers, migrations |
| `(accounts)`   | Accounts domain                          | Domain logic, business rules                       |
| `(api)`        | API endpoints                            | JSON:API, GraphQL endpoints, RPC                   |
| `(graphql)`    | GraphQL-specific                         | Schema, resolvers, subscriptions                   |
| `(router)`     | Routing                                  | Router configuration                               |
| `(layout)`     | Layouts                                  | Layout modules and templates                       |
| `(db)`         | Database                                 | Migrations, seeds, snapshots, repo                 |
| `(i18n)`       | Internationalization                     | Gettext, translations, CLDR                        |
| `(telemetry)`  | Metrics/monitoring                       | Telemetry setup                                    |
| `(background)` | Background jobs                          | Oban, workers                                      |
| `(assets)`     | Static assets                            | Favicons, logos, vendor files                      |
| `(config)`     | Configuration                            | `config/*.exs` files                               |
| `(seo)`        | SEO                                      | `robots.txt`, sitemaps                             |
| None           | Root-level                               | `mix.exs`, `.gitignore`, `README.md`               |

## Enforcement

When reviewing commits or PRs:

1. Verify scope matches the file location/purpose.
2. Ensure `(client)` is used for all `client/` files.
3. Ensure `(web)` is used for backend web layer, not `(ui)`.
4. Check that root-level files don't have unnecessary scopes.
5. Confirm consistency within the same directory.

**The scope should make it immediately clear which part of the system was changed.**
