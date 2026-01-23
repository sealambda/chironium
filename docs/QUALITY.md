# Chironium Quality Tooling

Streamlined processes for running formatting, linting, and quality checks across both the Elixir/Phoenix backend and React/TypeScript frontend.

## Quick Reference

```bash
# Run all quality checks (no fixes).
./scripts/quality.sh

# Auto-fix formatting and linting issues.
./scripts/fix.sh

# Pre-commit checks (quality + tests).
./scripts/precommit.sh
```

## Why Prettier + ESLint (Not Biome)?

We chose **Prettier + ESLint** over Biome for:

- **Mature ecosystem** - Industry standard with extensive documentation
- **React integration** - Better plugin support for React 19, TanStack Router, shadcn
- **Stability** - Battle-tested across thousands of production apps
- **Configurability** - Fine-grained control for team standards
- **Universal IDE support** - Works everywhere (VS Code, IntelliJ, Vim, etc.)

While Biome is faster (10-100x), the performance difference is negligible for our project size, and stability/ecosystem maturity matter more for a production CRM.

---

## Architecture & Design Philosophy

### Fail-Fast Principle

Commands are ordered from **fastest → slowest** and **most critical → least critical**:

```txt
TypeScript (30-500ms) → Format Check (100ms) → Lint (500ms) → Dialyzer (30s+) → Tests (variable)
```

**Benefits:**

- Immediate feedback on critical issues (type errors, syntax)
- Don't waste time on slow checks if fast ones fail
- Better developer experience

### Security-First in CI

The `mix ci` alias runs `deps.audit` **first** to catch security vulnerabilities before anything else. If dependencies have known CVEs, the build fails immediately.

### Pragmatic Linting

ESLint's `react-refresh` rule is configured as **warnings** (not errors) because:

- shadcn components export CVA variants (`buttonVariants`, `badgeVariants`)
- TanStack Router files export loaders/actions
- Auth utilities mix components with helper functions

This balances Fast Refresh benefits with real-world code patterns.

### Error Resilience

The `./scripts/fix.sh` script uses smart error handling:

- Continues execution even if some steps fail
- Shows **all** issues at once (not just first failure)
- Still exits with error code if anything fails (good for CI)
- Provides helpful context ("some ESLint issues cannot be auto-fixed")

---

## Backend (Elixir/Phoenix/Ash)

### Available Mix Tasks

```bash
# Format code.
mix format

# Check formatting without changes.
mix format.check

# Run linter (Credo) and security scanner (Sobelow).
mix lint

# Auto-fix formatting.
mix lint.fix

# Full quality suite (compile, format, lint, security, dialyzer).
mix quality

# Pre-commit checks (quality + tests, no dialyzer).
mix precommit

# CI checks (security audit + quality + tests + dialyzer).
mix ci
```

### Configuration (mix.exs)

All quality tasks are defined as Mix aliases in `mix.exs`:

```elixir
defp aliases do
  [
    # Basic formatting.
    "format.check": ["format --check-formatted"],

    # Quick quality checks (no dialyzer, no tests).
    lint: ["format --check-formatted", "credo --strict", "sobelow --config"],
    "lint.fix": ["format"],

    # Full quality suite (includes slow dialyzer).
    quality: [
      "compile --warnings-as-errors",
      "format --check-formatted",
      "credo --strict",
      "sobelow --config",
      "dialyzer"
    ],

    # Pre-commit (quality + tests, no dialyzer for speed).
    precommit: [
      "compile --warnings-as-errors",
      "deps.unlock --unused",
      "format --check-formatted",
      "credo --strict",
      "sobelow --config",
      "test"
    ],

    # CI (security first, then everything).
    ci: [
      "deps.audit",              # Security first (fail fast on CVEs).
      "compile --warnings-as-errors",
      "format --check-formatted",
      "credo --strict",
      "sobelow --config",
      "dialyzer",
      "test"
    ]
  ]
end
```

**Command Order Rationale:**

1. **`deps.audit`** (CI only) - Security vulnerabilities caught first
2. **`compile --warnings-as-errors`** - Structural issues (fastest check)
3. **`deps.unlock --unused`** (precommit only) - Clean up unused deps
4. **`format --check-formatted`** - Code style (very fast)
5. **`credo --strict`** - Code quality (medium speed)
6. **`sobelow --config`** - Security analysis (medium speed)
7. **`dialyzer`** - Type analysis (slowest, only in `quality` and `ci`)
8. **`test`** - Behavior verification (variable speed, last)

**Why this order?**

- Fast checks first = immediate feedback
- Security checks prioritized (deps.audit, sobelow)
- Slow checks (dialyzer) only where needed
- Tests last (they might take minutes)

### Tools Configured

- **mix format** - Elixir code formatter (`.formatter.exs`)
- **Credo** - Static code analysis and linting (`.credo.exs`)
- **Sobelow** - Security-focused static analysis (`.sobelow-conf`)
- **Dialyzer** - Type checking and analysis (`priv/plts/dialyzer.plt`)

**Files:**

- `.formatter.exs` - Formatter configuration (import deps, line length, etc.)
- `.credo.exs` - Linter rules (strict mode enabled, max line length 120)
- `.sobelow-conf` - Security scanner configuration
- `.dialyzer_ignore.exs` - Known false positives to ignore

---

## Frontend (React/TypeScript)

### Available pnpm Scripts

```bash
cd client

# Format code.
pnpm run format

# Check formatting without changes.
pnpm run format:check

# Run ESLint.
pnpm run lint

# Auto-fix ESLint issues.
pnpm run lint:fix

# Run TypeScript type checking.
pnpm run typecheck

# Full quality suite (typecheck + format check + lint).
pnpm run quality

# Auto-fix everything possible (format + lint fix, no typecheck).
pnpm run quality:fix

# Pre-commit checks (same as quality).
pnpm run precommit

# CI checks (quality + build).
pnpm run ci
```

### Configuration (package.json)

All quality tasks are defined as npm scripts in `client/package.json`:

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc -b --noEmit",

    "quality": "pnpm run typecheck && pnpm run format:check && pnpm run lint",
    "quality:fix": "pnpm run format && pnpm run lint:fix",
    "precommit": "pnpm run quality",
    "ci": "pnpm run quality && pnpm run build"
  }
}
```

**Command Order Rationale:**

1. **`typecheck`** - Type errors are fastest to check and most critical (30-500ms)
2. **`format:check`** - Formatting issues second (100ms)
3. **`lint`** - Code quality rules last (500ms)
4. **`build`** - Final verification (only in CI)

**Why `typecheck` first?**

- TypeScript compiler is blazingly fast
- Type errors indicate fundamental problems
- No point checking formatting if types are broken
- Fail-fast principle = better DX

**Why no typecheck in `quality:fix`?**

- Auto-fix commands (format, lint:fix) don't change types
- Running typecheck after is redundant
- Developer will run `quality` (which includes typecheck) to verify

### Tools Configured

- **Prettier 3.8** - Code formatter
- **ESLint 9.39** - Linting and code quality (flat config)
- **TypeScript 5.9** - Type checking

**Files:**

- `client/.prettierrc` - Formatter config (semi, singleQuote, printWidth: 100)
- `client/.prettierignore` - Files to skip (dist, node_modules, ash.ts)
- `client/eslint.config.js` - ESLint flat config with React plugins
- `client/tsconfig.json` - TypeScript compiler options

### ESLint Configuration

The ESLint config (`client/eslint.config.js`) uses **ESLint 9 flat config** format:

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "src/lib/ash.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // Allow CVA variants, route exports, utility constants.
      "react-refresh/only-export-components": [
        "warn", // Warning, not error!
        {
          allowConstantExport: true,
          allowExportNames: ["loader", "action", "meta", "handle"],
        },
      ],
    },
  },
]);
```

**Key decisions:**

- **`react-refresh` as warning** - Allows shadcn patterns (CVA exports)
- **`allowConstantExport: true`** - Permits `buttonVariants`, `badgeVariants`
- **`allowExportNames`** - TanStack Router exports (loader, action, meta)
- **Ignores generated files** - `src/lib/ash.ts` is auto-generated

---

## Root-Level Scripts

Located in `./scripts/`:

### `./scripts/quality.sh`

Runs all quality checks for both backend and frontend:

**Backend:**

1. Compile with warnings as errors
2. Check for unused dependencies
3. Format check
4. Credo (linter)
5. Sobelow (security)

**Frontend:**

1. TypeScript type checking
2. Prettier format check
3. ESLint

**Use this before committing** to ensure code quality.

**Exit behavior:** Fails on first error (strict mode).

### `./scripts/fix.sh`

Auto-fixes all auto-fixable issues:

**Backend:**

1. `mix format` - Auto-format all Elixir code

**Frontend:**

1. `prettier --write` - Auto-format all TS/TSX/CSS
2. `eslint --fix` - Auto-fix ESLint issues

**Use this during development** to quickly fix formatting and common linting issues.

**Exit behavior:**

- Continues even if some steps fail
- Shows all issues at once
- Exits with error code if any step failed
- Provides helpful messages about unfixable issues

**Note:** Some ESLint warnings (e.g., `react-refresh/only-export-components`) cannot be auto-fixed and are expected in shadcn components.

### `./scripts/precommit.sh`

Runs comprehensive pre-commit checks:

**Backend:**

- `mix precommit` (quality + tests, no dialyzer)

**Frontend:**

- `pnpm run precommit` (typecheck + format check + lint)

**Use this before pushing** to ensure everything passes.

**Exit behavior:** Fails on first error. Tests must pass.

---

## Typical Workflow

### During Development

```bash
# Make code changes...

# Auto-fix formatting and linting.
./scripts/fix.sh

# Verify everything passes.
./scripts/quality.sh
```

### Before Committing

```bash
# Run full pre-commit checks.
./scripts/precommit.sh

# If tests fail, fix issues and re-run.
# Commit when all checks pass.
git commit -m "feat(client): Add new feature"
```

### Backend-Only Changes

```bash
# Auto-fix.
mix format

# Check quality.
mix lint

# Or run everything including tests.
mix precommit
```

### Frontend-Only Changes

```bash
cd client

# Auto-fix.
pnpm run quality:fix

# Check quality.
pnpm run quality

# Build to verify.
pnpm run build
```

---

## IDE Integration

### VS Code

Install these extensions for automatic formatting on save:

- **Elixir**: ElixirLS
- **Prettier**: esbenp.prettier-vscode
- **ESLint**: dbaeumer.vscode-eslint

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[elixir]": {
    "editor.defaultFormatter": "elixir-lsp.elixir-ls"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Configuration Files

### Backend

| File                   | Purpose                   | Key Settings                                                   |
| ---------------------- | ------------------------- | -------------------------------------------------------------- |
| `.formatter.exs`       | Elixir code formatter     | Import deps for plugins, line length                           |
| `.credo.exs`           | Static analysis & linting | Strict mode, max line length 120, custom checks enabled        |
| `.sobelow-conf`        | Security scanner          | Security rules for Phoenix/Plug                                |
| `.dialyzer_ignore.exs` | Dialyzer false positives  | Known warnings to suppress                                     |
| `priv/plts/`           | Dialyzer PLT cache        | Precompiled type info (speeds up subsequent runs)              |
| `mix.exs` (aliases)    | Task definitions          | All `mix lint`, `mix quality`, `mix precommit`, `mix ci` tasks |

### Frontend

| File                      | Purpose               | Key Settings                                                   |
| ------------------------- | --------------------- | -------------------------------------------------------------- |
| `client/.prettierrc`      | Code formatter        | `printWidth: 100`, `singleQuote: true`, `semi: true`           |
| `client/.prettierignore`  | Prettier exclusions   | Ignores `dist/`, `node_modules/`, `src/lib/ash.ts`             |
| `client/eslint.config.js` | Linter & code quality | ESLint 9 flat config, React hooks, `react-refresh` as warnings |
| `client/tsconfig.json`    | TypeScript compiler   | Strict mode, React JSX, paths configuration                    |
| `client/package.json`     | npm scripts           | All `pnpm run quality`, `pnpm run lint`, etc. defined here     |

### Root-Level Scripts

| File                   | Purpose                 | Error Handling                                              |
| ---------------------- | ----------------------- | ----------------------------------------------------------- |
| `scripts/quality.sh`   | Unified quality checks  | Fails on first error (strict)                               |
| `scripts/fix.sh`       | Unified auto-fix        | Continues on error, shows all issues, exits 1 if any failed |
| `scripts/precommit.sh` | Pre-commit verification | Fails on first error (strict)                               |

---

## CI/CD Integration

Use these commands in your CI pipeline:

````yaml
# Backend CI.
- mix deps.get
- mix ci # Runs compile, format, lint, security, dialyzer, and tests.

# Frontend CI.
- cd client && pnpm install
Takes ~5-10 seconds vs. minutes for full test suite.

### "Dialyzer is slow"

Dialyzer only needs to run occasionally. For daily work:

```bash
mix precommit  # Skips dialyzer (saves 20-60 seconds).
````

Run dialyzer separately when needed:

```bash
mix dialyzer  # Run when you change type specs or @spec annotations.
```

**Pro tip:** Dialyzer PLT is cached in `priv/plts/`, so first run is slowest.

### "I want to skip tests temporarily"

```bash
mix lint  # Quality checks without tests.
```

Or for frontend:

```bash
cd client && pnpm run quality  # No tests in frontend (those are backend tests).
```

### "ESLint warnings about react-refresh"

**This is normal and expected!**

The warnings like:

```
warning  Fast refresh only works when a file only exports components
```

Are **intentional warnings** (not errors) because:

- shadcn components export CVA variants (`buttonVariants`)
- TanStack Router files export `loader`, `action`, `meta`
- Auth utilities mix components with helpers

**You can ignore these warnings.** They won't block builds or commits.

If you want to silence them for a specific file, add:

````typescriptDialyzer | Time     | Use Case                       |
| ------------------------ | ------- | -------- | ----- | -------- | -------- | ------------------------------ |
| `./scripts/fix.sh`       | ✅      | ✅       | ❌    | ❌       | ~10s     | Auto-fix during development    |
| `./scripts/quality.sh`   | ✅      | ✅       | ❌    | ❌       | ~10-15s  | Quick quality checks           |
| `./scripts/precommit.sh` | ✅      | ✅       | ✅    | ❌       | ~2-5min  | Pre-commit verification        |
| `mix format`             | ✅      | ❌       | ❌    | ❌       | ~1s      | Format backend only            |
| `mix lint`               | ✅      | ❌       | ❌    | ❌       | ~5-10s   | Backend quick checks           |
| `mix quality`            | ✅      | ❌       | ❌    | ✅       | ~30-60s  | Backend full quality           |
| `mix precommit`          | ✅      | ❌       | ✅    | ❌       | ~2-5min  | Backend + tests                |
| `mix ci`                 | ✅      | ❌       | ✅    | ✅       | ~3-6min  | CI/CD (security first)         |
| `pnpm run quality:fix`   | ❌      | ✅       | ❌    | ❌       | ~2-5s    | Frontend auto-fix              |
| `pnpm run quality`       | ❌      | ✅       | ❌    | ❌       | ~2-5s    | Frontend checks                |

### Recommended Workflow

**During development (frequent):**
```bash
./scripts/fix.sh  # Auto-fix formatting/linting (fast).
````

**Before each commit (always):**

```bash
./scripts/precommit.sh  # Full checks + tests (slow but thorough).
```

**Quick backend-only changes:**

```bash
mix format && mix lint  # Format + quick checks (no tests).
```

**Quick frontend-only changes:**

```bash
cd client && pnpm run quality:fix  # Auto-fix everything.
```

**When you change type specs (@spec):**

```bash
mix dialyzer  # Verify types (slow but important).
```

### Command Ordering Philosophy

All commands follow the **Fail-Fast Principle**:

1. **Security** - Audit dependencies first (CI)
2. **Types** - TypeScript/Dialyzer catch structural issues
3. **Format** - Code style (fastest check)
4. **Lint** - Code quality (medium speed)
5. **Tests** - Behavior verification (slowest)

**Why?**

- Immediate feedback on critical issues
- Don't waste time on slow checks if fast ones fail
- Better developer experience
- Cheaper CI (fail early = less compute time)

```bash
mix ash.codegen
```

This regenerates the TypeScript client from Ash resources.

### "Prettier says 'unchanged' but I see formatting issues"

Prettier only formats files matching the glob pattern: `src/**/*.{ts,tsx,css}`

If you have files outside `src/` (like root config files), format them separately:

```bash
cd client
npx prettier --write "*.{js,ts,json}"
```

Or add them to the `format` script in `package.json`.

### "./scripts/fix.sh exits with error but I don't see what failed"

The script now shows all issues before exiting. Look for:

- ⚠️ warnings in the output
- Red error messages from tools
- "Some ESLint issues cannot be auto-fixed" message

Common unfixable issues:

- React Refresh warnings (ignore them)
- Complex Credo violations (refactor needed)
- Type errors (fix manually)

### "I want to skip tests temporarily"

```bash
mix lint  # Quality checks without tests.
```

### "Frontend checks are failing on generated files"

The generated `client/src/lib/ash.ts` file is ignored in both ESLint and Prettier configs.

If you see issues, regenerate:

```bash
mix ash.codegen
```

---

## Summary

| Command                  | Backend | Frontend | Tests | Use Case                |
| ------------------------ | ------- | -------- | ----- | ----------------------- |
| `./scripts/fix.sh`       | ✅      | ✅       | ❌    | Auto-fix formatting     |
| `./scripts/quality.sh`   | ✅      | ✅       | ❌    | Quality checks          |
| `./scripts/precommit.sh` | ✅      | ✅       | ✅    | Pre-commit verification |
| `mix lint`               | ✅      | ❌       | ❌    | Backend quick checks    |
| `mix precommit`          | ✅      | ❌       | ✅    | Backend full checks     |
| `pnpm run quality`       | ❌      | ✅       | ❌    | Frontend checks         |

**Recommendation**: Use `./scripts/fix.sh` frequently during development, and `./scripts/precommit.sh` before committing.
