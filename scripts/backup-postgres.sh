#!/bin/bash
# PostgreSQL backup script

set -e

# Configuration
DB_NAME="keenon"
BACKUP_DIR="/var/lib/postgresql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Create database backup
echo "Creating backup of ${DB_NAME} database..."
pg_dump -U postgres ${DB_NAME} | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup created successfully: ${BACKUP_FILE}"

  # Clean up old backups
  echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
  find ${BACKUP_DIR} -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

  # Log backup information
  echo "$(date): Backup created: ${BACKUP_FILE}" >> ${BACKUP_DIR}/backup.log
else
  echo "Backup failed!"
  echo "$(date): Backup failed" >> ${BACKUP_DIR}/backup.log
  exit 1
fi

# Create a symlink to the latest backup
ln -sf ${BACKUP_FILE} ${BACKUP_DIR}/${DB_NAME}_latest.sql.gz

echo "Backup process completed."
