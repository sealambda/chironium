---
description: "Use when running Ash codegen, generating migrations, or making changes to Ash resources that need database migrations. Covers mix ash.codegen and mix ash.migrate workflows."
applyTo: "lib/**/*.ex"
---
# Ash Codegen During Development

When making changes that require a migration (adding attributes, changing resource schemas, etc.), always run codegen in dev mode:

```bash
mix ash.codegen --dev
```

This generates a throwaway dev migration that can be iterated on freely. The user will choose the final migration name once all changes are complete.

- Never invent a migration name during development — always use `--dev`.
- Never run `mix ash.codegen <name>` unless the user explicitly provides the name.
