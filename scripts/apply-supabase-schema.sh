#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="${SQL_FILE:-$REPO_ROOT/sql/SETUP_BASE_SUPABASE.sql}"
DB_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "❌ Falta la URL de conexión de la base de datos."
  echo "Define SUPABASE_DATABASE_URL o DATABASE_URL."
  echo "Ejemplo:"
  echo "  export SUPABASE_DATABASE_URL='postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres'"
  echo "  ./scripts/apply-supabase-schema.sh"
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "❌ No existe el archivo SQL: $SQL_FILE"
  exit 1
fi

echo "📄 Ejecutando esquema desde: $SQL_FILE"
echo "🗄️  Destino: $DB_URL"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo ""
echo "✅ Esquema aplicado correctamente."
