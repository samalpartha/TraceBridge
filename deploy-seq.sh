#!/bin/bash
set -e
APP_DIR="/home/psama0214/app"
cd "$APP_DIR"
echo "Working directory: $(pwd)"
ls -la docker-compose.prod.yml

PROD_FILE="docker-compose.prod.yml"

if [ ! -f "$PROD_FILE" ]; then
    echo "Error: $PROD_FILE not found in $APP_DIR"
    exit 1
fi

echo "Using compose file: $PROD_FILE"

echo 'Stopping any existing builds/services...'
# Try to down using prod file, if fails, try default, if fails, just continue
sudo docker compose -f "$PROD_FILE" down --remove-orphans || sudo docker compose down --remove-orphans || true

pkill -f 'docker-compose' || true
pkill -f 'docker buildx' || true

echo 'Building backend image (shared)...'
sudo docker compose -f "$PROD_FILE" build backend

echo 'Starting services...'
sudo docker compose -f "$PROD_FILE" up -d --build
