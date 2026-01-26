#!/usr/bin/env bash
# Pre-commit script for the entire Chironium project.
# Runs quality checks and tests before committing.

set -e

echo "Running pre-commit checks..."
echo ""

# Backend (Elixir/Phoenix/Ash).
echo "Backend (Elixir/Phoenix/Ash)..."
mix precommit

echo ""

# Frontend (React/TypeScript).
echo "Frontend (React/TypeScript)..."
cd assets
pnpm run precommit
cd ..

echo ""
echo "All pre-commit checks passed!"
echo "Ready to commit!"
