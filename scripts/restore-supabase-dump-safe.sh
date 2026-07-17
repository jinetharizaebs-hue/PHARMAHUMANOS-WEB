#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP_FILE="${1:-$REPO_ROOT/backup_origen.dump}"
DB_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "❌ Falta la URL de conexión de la base de datos."
  echo "Define la variable SUPABASE_DATABASE_URL antes de ejecutar."
  echo ""
  echo "Ejemplo:"
  echo "  export SUPABASE_DATABASE_URL='postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres'"
  echo "  ./scripts/restore-supabase-dump-safe.sh"
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "❌ No existe el archivo de respaldo: $DUMP_FILE"
  exit 1
fi

# Extraer host de la URL
HOST=$(echo "$DB_URL" | sed -n 's/.*@\(db\.[^:]*\).*/\1/p')

if [[ -z "$HOST" ]]; then
  echo "❌ No se pudo extraer el host de la URL."
  exit 1
fi

echo "🔍 Validando conexión..."
echo "   Host: $HOST"

# Intentar resolver el host
if ! host "$HOST" >/dev/null 2>&1 && ! nslookup "$HOST" >/dev/null 2>&1; then
  echo "⚠️  ADVERTENCIA: No se puede resolver el host '$HOST'"
  echo ""
  echo "Posibles causas:"
  echo "  1. El proyecto en Supabase no existe o fue eliminado"
  echo "  2. El host en la URL es incorrecto"
  echo "  3. Problema de DNS en tu red"
  echo ""
  echo "Para continuar de todas formas, presiona Enter."
  echo "Para cancelar, presiona Ctrl+C"
  read -r
fi

echo ""
echo "📦 Restaurando respaldo: $DUMP_FILE"
echo "🗄️  Destino: $(echo "$DB_URL" | sed 's/:.*@/@/;s/@.*/@.../')"
echo ""

# Intentar restauración con reintentos
MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Intento $ATTEMPT de $MAX_ATTEMPTS..."
  
  if pg_restore \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --single-transaction \
    --dbname="$DB_URL" \
    "$DUMP_FILE"; then
    echo ""
    echo "✅ Restauración completada exitosamente."
    exit 0
  else
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
      echo "❌ Intento $((ATTEMPT - 1)) falló. Esperando 5 segundos..."
      sleep 5
    fi
  fi
done

echo ""
echo "❌ La restauración falló después de $MAX_ATTEMPTS intentos."
echo ""
echo "Verifica que:"
echo "  - El proyecto existe en Supabase"
echo "  - La contraseña es correcta"
echo "  - El host es exacto: $HOST"
echo "  - Tienes conexión a internet"
exit 1
