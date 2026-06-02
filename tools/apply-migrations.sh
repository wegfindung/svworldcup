#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  env_db_container=$(sed -n 's/^[[:space:]]*DB_CONTAINER_NAME[[:space:]]*=[[:space:]]*//p' .env | tail -n 1 | tr -d '\r')
  env_db_container=$(printf "%s" "$env_db_container" | sed 's/^["'\'']//; s/["'\'']$//')
fi

DB_CONTAINER_NAME=${DB_CONTAINER_NAME:-${env_db_container:-svworldcup-db}}

psql_exec() {
  docker exec -i "$DB_CONTAINER_NAME" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

psql_query() {
  docker exec -i "$DB_CONTAINER_NAME" sh -lc 'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

psql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

for file in $(find db/migrations -maxdepth 1 -type f -name '*.sql' | sort); do
  filename=$(basename "$file")
  checksum=$(sha256sum "$file" | awk '{print $1}')
  escaped_filename=$(sql_escape "$filename")
  escaped_checksum=$(sql_escape "$checksum")
  applied_checksum=$(printf "SELECT checksum FROM schema_migrations WHERE filename = '%s';\n" "$escaped_filename" | psql_query)

  if [ "$applied_checksum" = "$checksum" ]; then
    echo "Skipping migration: $file"
    continue
  fi

  if [ -n "$applied_checksum" ]; then
    echo "Migration checksum mismatch: $file" >&2
    echo "Applied: $applied_checksum" >&2
    echo "Current: $checksum" >&2
    exit 1
  fi

  echo "Applying migration: $file"
  psql_exec < "$file"
  printf "INSERT INTO schema_migrations (filename, checksum) VALUES ('%s', '%s');\n" "$escaped_filename" "$escaped_checksum" | psql_exec
done
