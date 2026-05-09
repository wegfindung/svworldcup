#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

for file in $(find db/migrations -maxdepth 1 -type f -name '*.sql' | sort); do
  echo "Applying migration: $file"
  docker exec -i svworldcup-db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
done
