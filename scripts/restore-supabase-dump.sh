#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP_FILE="${1:-$REPO_ROOT/backup_origen.dump}"
DB_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "❌ Falta la URL de conexión de la nueva base de datos."
  echo "Define la variable SUPABASE_DATABASE_URL o DATABASE_URL antes de ejecutar."
  echo "Ejemplo:"
  echo "  export SUPABASE_DATABASE_URL='postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres'"
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "❌ No existe el archivo de respaldo: $DUMP_FILE"
  exit 1
fi

echo "📦 Restaurando respaldo: $DUMP_FILE"
echo "🗄️  Destino: $DB_URL"

echo ""

pg_restore \
  --verbose \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --dbname="$DB_URL" \
  "$DUMP_FILE"

echo ""
echo "✅ Restauración completada."
