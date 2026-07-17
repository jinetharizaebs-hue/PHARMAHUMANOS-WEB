#!/usr/bin/env bash
set -euo pipefail

SOURCE_URL="${SOURCE_DATABASE_URL:-${1:-}}"
TARGET_URL="${TARGET_DATABASE_URL:-${2:-}}"

if [[ -z "$SOURCE_URL" || -z "$TARGET_URL" ]]; then
  echo "❌ Debes proporcionar una URL de origen y otra de destino."
  echo "Uso:"
  echo "  SOURCE_DATABASE_URL='postgresql://...' TARGET_DATABASE_URL='postgresql://...' ./scripts/sync-schema.sh"
  echo "  o"
  echo "  ./scripts/sync-schema.sh 'postgresql://ORIGEN' 'postgresql://DESTINO'"
  exit 1
fi

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

echo "📦 Exportando esquema desde la base origen..."
pg_dump \
  --schema-only \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --quote-all-identifiers \
  --dbname="$SOURCE_URL" > "$TMP_SQL"

echo "🗄️ Aplicando esquema en la base destino..."
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$TMP_SQL"

echo ""
echo "✅ Esquema copiado correctamente."
