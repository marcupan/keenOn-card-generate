#!/bin/bash
# Setup script for HashiCorp Vault for secret management

set -e

# Configuration
VAULT_VERSION="1.9.2"
VAULT_DIR="/opt/vault"
CONFIG_DIR="${VAULT_DIR}/config"
DATA_DIR="${VAULT_DIR}/data"
LOG_DIR="${VAULT_DIR}/logs"
VAULT_ADDR="http://127.0.0.1:8200"
VAULT_TOKEN_FILE="${VAULT_DIR}/root_token.txt"

# Create directories
echo "Creating directories..."
sudo mkdir -p ${CONFIG_DIR} ${DATA_DIR} ${LOG_DIR}

# Download and install Vault
echo "Installing Vault ${VAULT_VERSION}..."
wget -q https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_linux_amd64.zip
unzip vault_${VAULT_VERSION}_linux_amd64.zip
sudo mv vault /usr/local/bin/
rm vault_${VAULT_VERSION}_linux_amd64.zip

# Create Vault configuration
echo "Configuring Vault..."
cat > vault.hcl << EOF
storage "file" {
  path = "${DATA_DIR}"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

api_addr = "${VAULT_ADDR}"
ui = true
EOF

sudo mv vault.hcl ${CONFIG_DIR}/

# Create Vault systemd service
echo "Creating Vault systemd service..."
cat > vault.service << EOF
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
After=network-online.target
Wants=network-online.target

[Service]
User=vault
Group=vault
ExecStart=/usr/local/bin/vault server -config=${CONFIG_DIR}/vault.hcl
ExecReload=/bin/kill -HUP \$MAINPID
KillSignal=SIGINT
Restart=on-failure
LimitMEMLOCK=infinity
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo mv vault.service /etc/systemd/system/

# Create vault user and set permissions
echo "Setting up users and permissions..."
sudo groupadd -f vault
sudo useradd -g vault -s /bin/false vault || true

sudo chown -R vault:vault ${VAULT_DIR}
sudo chmod -R 750 ${VAULT_DIR}

# Reload systemd and start Vault
echo "Starting Vault service..."
sudo systemctl daemon-reload
sudo systemctl enable vault
sudo systemctl start vault

# Wait for Vault to start
echo "Waiting for Vault to start..."
sleep 5

# Initialize Vault
echo "Initializing Vault..."
export VAULT_ADDR=${VAULT_ADDR}
INIT_RESPONSE=$(vault operator init -format=json -key-shares=3 -key-threshold=2)

# Save root token and unseal keys
echo "Saving root token and unseal keys..."
echo ${INIT_RESPONSE} | jq -r '.root_token' > ${VAULT_TOKEN_FILE}
echo ${INIT_RESPONSE} | jq -r '.unseal_keys_b64[0]' > ${VAULT_DIR}/unseal_key_1.txt
echo ${INIT_RESPONSE} | jq -r '.unseal_keys_b64[1]' > ${VAULT_DIR}/unseal_key_2.txt
echo ${INIT_RESPONSE} | jq -r '.unseal_keys_b64[2]' > ${VAULT_DIR}/unseal_key_3.txt

sudo chown vault:vault ${VAULT_TOKEN_FILE} ${VAULT_DIR}/unseal_key_*.txt
sudo chmod 600 ${VAULT_TOKEN_FILE} ${VAULT_DIR}/unseal_key_*.txt

# Unseal Vault
echo "Unsealing Vault..."
vault operator unseal $(cat ${VAULT_DIR}/unseal_key_1.txt)
vault operator unseal $(cat ${VAULT_DIR}/unseal_key_2.txt)

# Login to Vault
echo "Logging in to Vault..."
export VAULT_TOKEN=$(cat ${VAULT_TOKEN_FILE})

# Enable secrets engines
echo "Enabling secrets engines..."
vault secrets enable -path=keenon/kv kv-v2
vault secrets enable transit

# Create policies
echo "Creating policies..."
cat > app-policy.hcl << EOF
# Allow the app to read secrets
path "keenon/kv/data/app/*" {
  capabilities = ["read"]
}

# Allow the app to use transit encryption
path "transit/encrypt/app-key" {
  capabilities = ["update"]
}

path "transit/decrypt/app-key" {
  capabilities = ["update"]
}
EOF

vault policy write app-policy app-policy.hcl
rm app-policy.hcl

# Create transit encryption key
echo "Creating transit encryption key..."
vault write -f transit/keys/app-key

# Store initial secrets
echo "Storing initial secrets..."
vault kv put keenon/kv/app/database \
  username="postgres" \
  password="$(openssl rand -base64 16)" \
  host="localhost" \
  port="5432" \
  database="keenon"

vault kv put keenon/kv/app/redis \
  host="localhost" \
  port="6379" \
  password=""

vault kv put keenon/kv/app/jwt \
  access_token_private_key="$(openssl genrsa 2048 2>/dev/null)" \
  access_token_public_key="$(openssl genrsa 2048 2>/dev/null | openssl rsa -pubout 2>/dev/null)" \
  refresh_token_private_key="$(openssl genrsa 2048 2>/dev/null)" \
  refresh_token_public_key="$(openssl genrsa 2048 2>/dev/null | openssl rsa -pubout 2>/dev/null)"

vault kv put keenon/kv/app/encryption \
  key="$(openssl rand -base64 32)"

# Create app role for authentication
echo "Creating AppRole authentication..."
vault auth enable approle

vault write auth/approle/role/app-role \
  secret_id_ttl=0 \
  token_ttl=1h \
  token_max_ttl=24h \
  policies=app-policy

# Get role ID and secret ID
ROLE_ID=$(vault read -format=json auth/approle/role/app-role/role-id | jq -r '.data.role_id')
SECRET_ID=$(vault write -format=json -f auth/approle/role/app-role/secret-id | jq -r '.data.secret_id')

# Save role ID and secret ID to files
echo ${ROLE_ID} > ${VAULT_DIR}/app_role_id.txt
echo ${SECRET_ID} > ${VAULT_DIR}/app_secret_id.txt

sudo chown vault:vault ${VAULT_DIR}/app_role_id.txt ${VAULT_DIR}/app_secret_id.txt
sudo chmod 600 ${VAULT_DIR}/app_role_id.txt ${VAULT_DIR}/app_secret_id.txt

echo "Vault setup complete!"
echo "Vault UI: ${VAULT_ADDR}/ui"
echo ""
echo "IMPORTANT: Please securely store the unseal keys and root token."
echo "Root token is saved at: ${VAULT_TOKEN_FILE}"
echo "Unseal keys are saved at: ${VAULT_DIR}/unseal_key_*.txt"
echo "App role ID is saved at: ${VAULT_DIR}/app_role_id.txt"
echo "App secret ID is saved at: ${VAULT_DIR}/app_secret_id.txt"
echo ""
echo "To use Vault in your application, set the following environment variables:"
echo "export VAULT_ADDR=${VAULT_ADDR}"
echo "export VAULT_ROLE_ID=$(cat ${VAULT_DIR}/app_role_id.txt)"
echo "export VAULT_SECRET_ID=$(cat ${VAULT_DIR}/app_secret_id.txt)"
