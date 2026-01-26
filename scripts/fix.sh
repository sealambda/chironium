#!/usr/bin/env bash
# Auto-fix script for the entire Chironium project.
# Runs formatters and auto-fixers for both backend and frontend.

set -e

echo "Running auto-fix..."
echo ""

# Backend (Elixir/Phoenix/Ash).
echo "Backend (Elixir/Phoenix/Ash)..."
echo "  -> Formatting code..."
mix format

echo ""

# Frontend (React/TypeScript).
echo "Frontend (React/TypeScript)..."
cd assets

echo "  -> Running Biome fix (format + lint + imports)..."
pnpm run check:fix

cd ..

echo ""
echo "All auto-fixes applied!"
