#!/bin/sh
set -e
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"
