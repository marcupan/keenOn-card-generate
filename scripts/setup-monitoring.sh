#!/bin/bash
# Setup script for Prometheus and Grafana monitoring

set -e

# Configuration
PROMETHEUS_VERSION="2.30.3"
GRAFANA_VERSION="8.2.2"
NODE_EXPORTER_VERSION="1.2.2"
POSTGRES_EXPORTER_VERSION="0.10.0"
REDIS_EXPORTER_VERSION="1.31.1"

INSTALL_DIR="/opt/monitoring"
PROMETHEUS_DIR="${INSTALL_DIR}/prometheus"
GRAFANA_DIR="${INSTALL_DIR}/grafana"
EXPORTERS_DIR="${INSTALL_DIR}/exporters"

CONFIG_DIR="$(pwd)/monitoring"
PROMETHEUS_CONFIG_DIR="${CONFIG_DIR}/prometheus"
GRAFANA_CONFIG_DIR="${CONFIG_DIR}/grafana"

# Create directories
echo "Creating directories..."
sudo mkdir -p ${PROMETHEUS_DIR} ${GRAFANA_DIR} ${EXPORTERS_DIR}
sudo mkdir -p ${EXPORTERS_DIR}/node_exporter ${EXPORTERS_DIR}/postgres_exporter ${EXPORTERS_DIR}/redis_exporter

# Download and install Prometheus
echo "Installing Prometheus ${PROMETHEUS_VERSION}..."
wget -q https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
tar xzf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
sudo cp prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool ${PROMETHEUS_DIR}/
sudo cp -r prometheus-${PROMETHEUS_VERSION}.linux-amd64/consoles prometheus-${PROMETHEUS_VERSION}.linux-amd64/console_libraries ${PROMETHEUS_DIR}/
rm -rf prometheus-${PROMETHEUS_VERSION}.linux-amd64 prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz

# Copy Prometheus configuration
echo "Configuring Prometheus..."
sudo cp ${PROMETHEUS_CONFIG_DIR}/prometheus.yml ${PROMETHEUS_DIR}/
sudo cp ${PROMETHEUS_CONFIG_DIR}/alert_rules.yml ${PROMETHEUS_DIR}/

# Create Prometheus systemd service
echo "Creating Prometheus systemd service..."
cat > prometheus.service << EOF
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=${PROMETHEUS_DIR}/prometheus \\
    --config.file=${PROMETHEUS_DIR}/prometheus.yml \\
    --storage.tsdb.path=${PROMETHEUS_DIR}/data \\
    --web.console.templates=${PROMETHEUS_DIR}/consoles \\
    --web.console.libraries=${PROMETHEUS_DIR}/console_libraries \\
    --web.listen-address=0.0.0.0:9090 \\
    --web.enable-lifecycle

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv prometheus.service /etc/systemd/system/

# Download and install Node Exporter
echo "Installing Node Exporter ${NODE_EXPORTER_VERSION}..."
wget -q https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xzf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
sudo cp node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter ${EXPORTERS_DIR}/node_exporter/
rm -rf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64 node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz

# Create Node Exporter systemd service
echo "Creating Node Exporter systemd service..."
cat > node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=${EXPORTERS_DIR}/node_exporter/node_exporter

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv node_exporter.service /etc/systemd/system/

# Download and install Postgres Exporter
echo "Installing Postgres Exporter ${POSTGRES_EXPORTER_VERSION}..."
wget -q https://github.com/prometheus-community/postgres_exporter/releases/download/v${POSTGRES_EXPORTER_VERSION}/postgres_exporter-${POSTGRES_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xzf postgres_exporter-${POSTGRES_EXPORTER_VERSION}.linux-amd64.tar.gz
sudo cp postgres_exporter-${POSTGRES_EXPORTER_VERSION}.linux-amd64/postgres_exporter ${EXPORTERS_DIR}/postgres_exporter/
rm -rf postgres_exporter-${POSTGRES_EXPORTER_VERSION}.linux-amd64 postgres_exporter-${POSTGRES_EXPORTER_VERSION}.linux-amd64.tar.gz

# Create Postgres Exporter systemd service
echo "Creating Postgres Exporter systemd service..."
cat > postgres_exporter.service << EOF
[Unit]
Description=Postgres Exporter
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Environment="DATA_SOURCE_NAME=postgresql://postgres:postgres@localhost:5432/keenon?sslmode=disable"
ExecStart=${EXPORTERS_DIR}/postgres_exporter/postgres_exporter

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv postgres_exporter.service /etc/systemd/system/

# Download and install Redis Exporter
echo "Installing Redis Exporter ${REDIS_EXPORTER_VERSION}..."
wget -q https://github.com/oliver006/redis_exporter/releases/download/v${REDIS_EXPORTER_VERSION}/redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xzf redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64.tar.gz
sudo cp redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64/redis_exporter ${EXPORTERS_DIR}/redis_exporter/
rm -rf redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64 redis_exporter-v${REDIS_EXPORTER_VERSION}.linux-amd64.tar.gz

# Create Redis Exporter systemd service
echo "Creating Redis Exporter systemd service..."
cat > redis_exporter.service << EOF
[Unit]
Description=Redis Exporter
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Environment="REDIS_ADDR=redis://localhost:6379"
ExecStart=${EXPORTERS_DIR}/redis_exporter/redis_exporter

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv redis_exporter.service /etc/systemd/system/

# Download and install Grafana
echo "Installing Grafana ${GRAFANA_VERSION}..."
wget -q https://dl.grafana.com/oss/release/grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz
tar xzf grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz
sudo cp -r grafana-${GRAFANA_VERSION}/* ${GRAFANA_DIR}/
rm -rf grafana-${GRAFANA_VERSION} grafana-${GRAFANA_VERSION}.linux-amd64.tar.gz

# Copy Grafana dashboards
echo "Configuring Grafana..."
sudo mkdir -p ${GRAFANA_DIR}/dashboards
sudo cp ${GRAFANA_CONFIG_DIR}/dashboards/*.json ${GRAFANA_DIR}/dashboards/

# Create Grafana systemd service
echo "Creating Grafana systemd service..."
cat > grafana.service << EOF
[Unit]
Description=Grafana
After=network-online.target

[Service]
User=grafana
Group=grafana
Type=simple
ExecStart=${GRAFANA_DIR}/bin/grafana-server \\
    --config=${GRAFANA_DIR}/conf/defaults.ini \\
    --homepath=${GRAFANA_DIR} \\
    --packaging=docker

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv grafana.service /etc/systemd/system/

# Create users and set permissions
echo "Setting up users and permissions..."
sudo groupadd -f prometheus
sudo groupadd -f grafana
sudo useradd -g prometheus -s /bin/false prometheus || true
sudo useradd -g grafana -s /bin/false grafana || true

sudo chown -R prometheus:prometheus ${PROMETHEUS_DIR} ${EXPORTERS_DIR}
sudo chown -R grafana:grafana ${GRAFANA_DIR}

# Reload systemd and start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable prometheus node_exporter postgres_exporter redis_exporter grafana
sudo systemctl start prometheus node_exporter postgres_exporter redis_exporter grafana

echo "Monitoring setup complete!"
echo "Prometheus UI: http://localhost:9090"
echo "Grafana UI: http://localhost:3000 (default login: admin/admin)"
echo ""
echo "Don't forget to configure the Prometheus data source in Grafana and import the dashboards!"
