#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."

# Set a timeout of 60 seconds (30 attempts * 2 seconds)
timeout=30
counter=0

while true; do
  if [ $counter -ge $timeout ]; then
    echo "Timeout reached. PostgreSQL is still not ready after $timeout attempts."
    exit 1
  fi

  if pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
    echo "PostgreSQL is ready!"
    break
  fi

  counter=$((counter + 1))
  echo "PostgreSQL is unavailable - sleeping (attempt $counter/$timeout)"
  sleep 2
done
