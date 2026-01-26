#!/usr/bin/env bash
# Quality check script for the entire Chironium project.
# Runs formatting, linting, and type checking for both backend and frontend.

set -e

echo "Running quality checks..."
echo ""

# Backend (Elixir/Phoenix/Ash).
echo "Backend (Elixir/Phoenix/Ash)..."
echo "  -> Compiling with warnings as errors..."
mix compile --warnings-as-errors

echo "  -> Checking for unused dependencies..."
mix deps.unlock --check-unused

echo "  -> Checking code formatting..."
mix format --check-formatted

echo "  -> Running Credo (linter)..."
mix credo --strict

echo "  -> Running Sobelow (security)..."
mix sobelow --config

echo ""

# Frontend (React/TypeScript).
echo "Frontend (React/TypeScript)..."
cd assets

echo "  -> Running Biome (format + lint)..."
pnpm run check

echo "  -> Type checking..."
pnpm run typecheck

cd ..

echo ""
echo "All quality checks passed!"
