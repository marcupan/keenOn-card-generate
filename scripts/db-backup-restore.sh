#!/bin/bash
# Database backup and restore script for keenOn-card-generate service

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/keenon/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-keenon}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Function to display usage information
usage() {
  echo "Usage: $0 [OPTIONS] COMMAND"
  echo ""
  echo "Commands:"
  echo "  backup              Create a new backup"
  echo "  restore BACKUP_FILE Restore from a backup file"
  echo "  list                List available backups"
  echo "  cleanup             Remove backups older than RETENTION_DAYS"
  echo ""
  echo "Options:"
  echo "  -h, --help          Show this help message"
  echo "  -d, --directory DIR Set backup directory (default: ${BACKUP_DIR})"
  echo "  -r, --retention DAYS Set retention period in days (default: ${RETENTION_DAYS})"
  echo ""
  echo "Environment variables:"
  echo "  BACKUP_DIR          Backup directory"
  echo "  POSTGRES_HOST       PostgreSQL host"
  echo "  POSTGRES_PORT       PostgreSQL port"
  echo "  POSTGRES_USER       PostgreSQL user"
  echo "  POSTGRES_PASSWORD   PostgreSQL password"
  echo "  POSTGRES_DB         PostgreSQL database name"
  echo "  RETENTION_DAYS      Number of days to keep backups"
  echo ""
  echo "Examples:"
  echo "  $0 backup                     # Create a new backup"
  echo "  $0 restore backups/keenon_20220101_120000.sql.gz  # Restore from backup"
  echo "  $0 list                       # List available backups"
  echo "  $0 cleanup                    # Remove old backups"
  echo ""
}

# Function to create a backup
create_backup() {
  echo "Creating backup of ${POSTGRES_DB} database..."

  # Set PGPASSWORD environment variable for passwordless connection
  export PGPASSWORD="${POSTGRES_PASSWORD}"

  # Create backup using pg_dump and compress with gzip
  pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" -F c | gzip > "${BACKUP_FILE}"

  # Check if backup was successful
  if [ $? -eq 0 ]; then
    echo "Backup created successfully: ${BACKUP_FILE}"
    echo "Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"
  else
    echo "Backup failed!"
    exit 1
  fi

  # Unset PGPASSWORD for security
  unset PGPASSWORD
}

# Function to restore from a backup
restore_backup() {
  local backup_file="$1"

  # Check if backup file exists
  if [ ! -f "${backup_file}" ]; then
    echo "Error: Backup file ${backup_file} not found!"
    exit 1
  fi

  echo "Restoring ${POSTGRES_DB} database from ${backup_file}..."

  # Confirm before proceeding
  read -p "This will overwrite the current database. Are you sure? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
  fi

  # Set PGPASSWORD environment variable for passwordless connection
  export PGPASSWORD="${POSTGRES_PASSWORD}"

  # Drop and recreate the database
  echo "Dropping existing database..."
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}';" postgres
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" \
    -c "CREATE DATABASE ${POSTGRES_DB};" postgres

  # Restore from backup
  echo "Restoring from backup..."
  gunzip -c "${backup_file}" | pg_restore -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --role="${POSTGRES_USER}"

  # Check if restore was successful
  if [ $? -eq 0 ]; then
    echo "Database restored successfully from ${backup_file}"
  else
    echo "Restore failed!"
    exit 1
  fi

  # Unset PGPASSWORD for security
  unset PGPASSWORD
}

# Function to list available backups
list_backups() {
  echo "Available backups in ${BACKUP_DIR}:"
  echo "----------------------------------------"
  echo "Filename                          | Size    | Date"
  echo "----------------------------------------"

  # List backups with details
  find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.sql.gz" -type f | sort | while read backup; do
    filename=$(basename "${backup}")
    size=$(du -h "${backup}" | cut -f1)
    date=$(stat -c "%y" "${backup}" 2>/dev/null || stat -f "%Sm" "${backup}")
    echo "${filename} | ${size} | ${date}"
  done

  echo "----------------------------------------"
  echo "Total: $(find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.sql.gz" -type f | wc -l) backups"
}

# Function to clean up old backups
cleanup_backups() {
  echo "Cleaning up backups older than ${RETENTION_DAYS} days..."

  # Find and delete old backups
  find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} \;

  echo "Cleanup complete."
  echo "Remaining backups: $(find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.sql.gz" -type f | wc -l)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -d|--directory)
      BACKUP_DIR="$2"
      shift 2
      ;;
    -r|--retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    backup|restore|list|cleanup)
      COMMAND="$1"
      shift
      ;;
    *)
      # If we've already set a command, this must be an argument to it
      if [ -n "${COMMAND}" ]; then
        COMMAND_ARG="$1"
      else
        echo "Error: Unknown option $1"
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

# Execute the requested command
case "${COMMAND}" in
  backup)
    create_backup
    ;;
  restore)
    if [ -z "${COMMAND_ARG}" ]; then
      echo "Error: Backup file not specified for restore command"
      usage
      exit 1
    fi
    restore_backup "${COMMAND_ARG}"
    ;;
  list)
    list_backups
    ;;
  cleanup)
    cleanup_backups
    ;;
  *)
    echo "Error: No command specified"
    usage
    exit 1
    ;;
esac

exit 0
