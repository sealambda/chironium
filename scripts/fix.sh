#!/usr/bin/env bash
# Auto-fix script for the entire Chironium project.
# Automatically fixes formatting and auto-fixable linting issues.

set -e

BACKEND_FAILED=0
FRONTEND_FAILED=0

echo "🔧 Running auto-fix..."
echo ""

# Backend (Elixir/Phoenix/Ash).
echo "📦 Backend (Elixir/Phoenix/Ash)..."
echo "  → Formatting code..."
if ! mix format; then
  BACKEND_FAILED=1
  echo "  ⚠️  Backend formatting encountered issues"
fi

echo ""

# Frontend (React/TypeScript).
echo "⚛️  Frontend (React/TypeScript)..."
cd client

echo "  → Formatting code..."
if ! pnpm run format; then
  FRONTEND_FAILED=1
  echo "  ⚠️  Frontend formatting encountered issues"
fi

echo "  → Auto-fixing ESLint issues (some may remain)..."
if ! pnpm run lint:fix; then
  echo "  ⚠️  Some ESLint issues cannot be auto-fixed"
  echo "  💡 Review the errors above - you may need to fix them manually"
fi

cd ..

echo ""
if [ $BACKEND_FAILED -eq 0 ] && [ $FRONTEND_FAILED -eq 0 ]; then
  echo "✅ Auto-fix complete!"
  echo "💡 Run ./scripts/quality.sh to verify all checks pass."
else
  echo "⚠️  Auto-fix completed with some issues."
  echo "💡 Review the output above and fix remaining issues manually."
  exit 1
fi
