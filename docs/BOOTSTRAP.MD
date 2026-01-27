# Project Bootstrap Guide

Complete setup instructions for Chironium — an Ash Framework + Phoenix backend with React + TypeScript + Vite frontend.

## Stack Overview

### Backend

- Elixir + Phoenix + Ash Framework
- GraphQL endpoints
- PostgreSQL with Ash.Postgres
- Authentication (Google OAuth)
- Background jobs (Oban)
- Admin interface (Ash.Admin)

### Frontend

- React 18 + TypeScript
- Vite build tool
- shadcn/ui component library
- Tailwind CSS

### Platform Support

- Linux & macOS (native)
- Windows (via WSL2 or native with limitations)

## Prerequisites

### Required Software

- Git
- PostgreSQL (running and accessible)
- Erlang/Elixir (versions per `mix.exs`)
- Node.js `24.13.0`
- pnpm `10.28.0`

### Windows Users

- WSL2 (recommended) or Chocolatey + Git Bash
- Installing Elixir via Chocolatey automatically includes Erlang

### Windows Installation

#### Option 1: WSL2 (Recommended)

Use WSL2 + Ubuntu for full compatibility with Linux/macOS workflows. Follow the Linux instructions below within your WSL shell.

#### Option 2: Native Windows (Chocolatey)

```powershell
# Install core dependencies
choco install -y git postgresql elixir

# Configure pnpm (using Node.js Corepack)
corepack enable
corepack prepare pnpm@10.28.0 --activate
```

> **Note:** Use Git Bash or WSL for running shell scripts and the Ash auto-installer.

## Installation Methods

### Quick Start (One-Liner)

Auto-generated command from [Ash HQ](https://ash-hq.org/#get-started). Requires a POSIX shell (Bash/Zsh):

```sh
sh <(curl 'https://ash-hq.org/install/chironium?install=phoenix') && cd chironium \
  && mix igniter.install \
    ash ash_phoenix ash_graphql ash_postgres \
    ash_authentication ash_authentication_phoenix ash_admin ash_oban \
    oban_web ash_state_machine ash_events ash_archival tidewave \
    ash_paper_trail cloak ash_cloak usage_rules ash_money \
    --auth-strategy google --framework react --setup --yes
```

> **Note:** This approach is fast but opaque. For more control, use the step-by-step method below.

### Step-by-Step Installation (Recommended)

#### 1. Install Igniter Archive

```sh
mix archive.install hex igniter_new
```

#### 2. Create Project Skeleton

```sh
mix igniter.new chironium --install phoenix --yes
cd chironium
```

#### 3. Install Ash Framework & Extensions

```sh
mix igniter.install \
  ash ash_phoenix ash_graphql ash_postgres \
  ash_authentication ash_authentication_phoenix ash_admin ash_oban \
  oban_web ash_state_machine ash_events ash_archival tidewave \
  ash_paper_trail cloak ash_cloak usage_rules ash_money \
  --auth-strategy google --framework react --setup --yes
```

#### 4. Configure Backend

```sh
# Install dependencies
mix deps.get

# Create database, run migrations, seed data
mix ecto.setup

# Verify installation
MIX_ENV=test mix test
```

#### 5. Setup Frontend

```sh
cd client
pnpm install
pnpm dev
```

#### 6. Add shadcn/ui Components (Optional)

```sh
cd client
pnpm dlx shadcn@latest create
```

Follow the interactive prompts to complete UI scaffolding.

## Platform-Specific Notes

### Windows Considerations

#### Best Practices

- Use WSL2 for maximum compatibility with shell-based tooling
- Avoid running `sh <(curl ...)` commands directly in PowerShell
- Use Git Bash or WSL for POSIX-dependent scripts

#### Native Windows Setup

- Install via Chocolatey: `choco install elixir` (includes Erlang)
- Verify PostgreSQL is running before `mix ecto.setup`
- Ensure `DATABASE_URL` environment variable is correctly configured (see `config/dev.exs`)

## Verification

### Version Checks

```sh
elixir -v      # Check Elixir/OTP versions against mix.exs
node -v        # Should output v24.13.0
pnpm -v        # Should output 10.28.0
```

### Installation Verification

- [ ] Elixir/OTP versions match `mix.exs` requirements
- [ ] Node and pnpm versions are correct
- [ ] `mix deps.get` completes successfully
- [ ] `mix ecto.setup` creates database and runs migrations
- [ ] `MIX_ENV=test mix test` passes
- [ ] `cd client && pnpm install` completes without errors
- [ ] Services start: `mix phx.server` (backend) and `pnpm dev` (frontend)

## Troubleshooting

### Common Issues

#### Elixir/OTP Version Mismatch

```sh
elixir -v  # Compare output with mix.exs requirements
```

#### PostgreSQL Connection Failed

- Verify PostgreSQL service is running
- Check credentials in `config/dev.exs`
- Confirm `DATABASE_URL` environment variable

#### Node/pnpm Package Failures

```sh
cd client
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Windows Path/Permission Errors

- Use WSL2 or Git Bash for shell commands
- Ensure POSIX-compatible terminal environment

### Getting Help

If issues persist:

1. Capture full error output from `mix deps.get` and `mix ecto.setup`
2. Document your environment:
   - OS and version
   - Elixir, OTP, Node, pnpm versions
   - PostgreSQL version
3. Open an issue with error details and environment information

## Resources

- [Ash Framework](https://ash-hq.org/)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs/installation)
- [Elixir Installation Guide](https://elixir-lang.org/install.html)
- [Phoenix Framework](https://www.phoenixframework.org/)
