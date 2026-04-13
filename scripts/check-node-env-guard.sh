#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="$REPO_ROOT/app/api/user/locale/route.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found"; exit 1
fi

# Allow ONLY exact === 'development'. All other NODE_ENV comparisons are forbidden.
FORBIDDEN_PATTERNS=(
  "NODE_ENV[^=]*!=+[^=]*'production'"
  "NODE_ENV[^=]*==+[^=]*'test'"
  "NODE_ENV[^=]*==+[^=]*'staging'"
  "NODE_ENV[^=]*!=+[^=]*'development'"
  "includes[[:space:]]*\(['\"]NODE_ENV"
  "\.NODE_ENV[[:space:]]*\|\|"
)

for re in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -Eq "$re" "$FILE" 2>/dev/null; then
    echo "❌ Forbidden NODE_ENV comparison in $FILE — pattern: $re"
    exit 1
  fi
done

echo "✅ NODE_ENV guard check passed"
