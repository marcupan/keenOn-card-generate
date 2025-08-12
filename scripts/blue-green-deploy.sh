#!/bin/bash
# scripts/blue-green-deploy.sh

set -e

# Configuration
APP_NAME="keenon-card-generate"
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
DEPLOY_DIR="/opt/${APP_NAME}"
BLUE_DIR="${DEPLOY_DIR}/blue"
GREEN_DIR="${DEPLOY_DIR}/green"
CURRENT_LINK="${DEPLOY_DIR}/current"

# Determine which environment is currently active
if [ -L ${CURRENT_LINK} ]; then
  CURRENT_ENV=$(basename $(readlink -f ${CURRENT_LINK}))
  echo "Current environment is: ${CURRENT_ENV}"

  if [ "${CURRENT_ENV}" = "blue" ]; then
    TARGET_ENV="green"
    TARGET_DIR=${GREEN_DIR}
    TARGET_PORT=${GREEN_PORT}
  else
    TARGET_ENV="blue"
    TARGET_DIR=${BLUE_DIR}
    TARGET_PORT=${BLUE_PORT}
  fi
else
  echo "No current environment found, defaulting to blue"
  TARGET_ENV="blue"
  TARGET_DIR=${BLUE_DIR}
  TARGET_PORT=${BLUE_PORT}
fi

echo "Deploying to ${TARGET_ENV} environment"

# Ensure target directory exists
mkdir -p ${TARGET_DIR}

# Copy application code to target directory
cp -R . ${TARGET_DIR}

# Install dependencies and build
cd ${TARGET_DIR}
pnpm install --frozen-lockfile
pnpm run build

# Update environment configuration
cat > ${TARGET_DIR}/.env << EOF
NODE_ENV=production
PORT=${TARGET_PORT}
# Add other environment variables here
EOF

# Start the new instance
cd ${TARGET_DIR}
pm2 start dist/app.js --name "${APP_NAME}-${TARGET_ENV}" -- --port ${TARGET_PORT}

# Wait for the new instance to be ready
echo "Waiting for the new instance to be ready..."
sleep 10

# Check if the new instance is healthy
HEALTH_CHECK=$(curl -s http://localhost:${TARGET_PORT}/api/health)
if [[ ${HEALTH_CHECK} != *"success"* ]]; then
  echo "Health check failed for new instance"
  pm2 stop "${APP_NAME}-${TARGET_ENV}"
  exit 1
fi

# Update Nginx configuration to point to the new instance
sudo tee ${NGINX_CONF} > /dev/null << EOF
server {
    listen 80;
    server_name api.keenon-card-generate.example.com;

    location / {
        proxy_pass http://localhost:${TARGET_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Update the current symlink
ln -sf ${TARGET_DIR} ${CURRENT_LINK}

# Stop the old instance after a grace period
echo "Waiting for connections to drain from the old instance..."
sleep 30

if [ "${CURRENT_ENV}" = "blue" ]; then
  pm2 stop "${APP_NAME}-blue" || true
else
  pm2 stop "${APP_NAME}-green" || true
fi

echo "Deployment complete!"
