#!/bin/bash
# Redis backup script

set -e

# Configuration
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD_FILE="/run/secrets/redis_password"
BACKUP_DIR="/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
RETENTION_DAYS=7

# Read Redis password from file
if [ -f "$REDIS_PASSWORD_FILE" ]; then
  REDIS_PASSWORD=$(cat $REDIS_PASSWORD_FILE)
else
  echo "Redis password file not found. Using environment variable."
  REDIS_PASSWORD=${REDIS_PASSWORD:-""}
fi

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Create Redis backup
echo "Creating backup of Redis data..."

# Trigger BGSAVE on Redis server
if [ -n "$REDIS_PASSWORD" ]; then
  redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD} BGSAVE
else
  redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} BGSAVE
fi

# Wait for BGSAVE to complete
echo "Waiting for BGSAVE to complete..."
sleep 5

# Check if BGSAVE is still in progress
while true; do
  if [ -n "$REDIS_PASSWORD" ]; then
    SAVE_IN_PROGRESS=$(redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD} INFO Persistence | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')
  else
    SAVE_IN_PROGRESS=$(redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} INFO Persistence | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')
  fi

  if [ "$SAVE_IN_PROGRESS" = "0" ]; then
    break
  fi

  echo "BGSAVE still in progress, waiting..."
  sleep 2
done

# Copy the RDB file
echo "Copying RDB file to backup location..."
cp /data/dump.rdb ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup created successfully: ${BACKUP_FILE}"

  # Compress the backup
  gzip ${BACKUP_FILE}

  # Clean up old backups
  echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
  find ${BACKUP_DIR} -name "redis_*.rdb.gz" -mtime +${RETENTION_DAYS} -delete

  # Log backup information
  echo "$(date): Backup created: ${BACKUP_FILE}.gz" >> ${BACKUP_DIR}/backup.log
else
  echo "Backup failed!"
  echo "$(date): Backup failed" >> ${BACKUP_DIR}/backup.log
  exit 1
fi

# Create a symlink to the latest backup
ln -sf ${BACKUP_FILE}.gz ${BACKUP_DIR}/redis_latest.rdb.gz

echo "Backup process completed."
