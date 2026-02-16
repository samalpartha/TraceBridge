#!/bin/bash
set -e

APP_DIR="$HOME/app"

# Update and install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Install Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Setup project
mkdir -p "$APP_DIR"
# The archive is likely in $HOME
tar -xzf "$HOME/project.tar.gz" -C "$APP_DIR" || true

cd "$APP_DIR"

# Create .env file
if [ -f .env.example ]; then
  cp .env.example .env
else
  touch .env
fi

# Append production overrides
echo "" >> .env
echo "NEXT_PUBLIC_API_URL=http://$(curl -s ifconfig.me):8000" >> .env
echo "DATABASE_URL=postgresql+asyncpg://reunite:reunite@postgres:5432/reuniteai" >> .env
echo "DATABASE_URL_SYNC=postgresql://reunite:reunite@postgres:5432/reuniteai" >> .env
echo "REDIS_URL=redis://redis:6379/0" >> .env
echo "SECRET_KEY=production_secret_key_change_me_$(date +%s)" >> .env

# Generate a prod-specific compose override
cat <<EOF > docker-compose.override.yml
version: "3.9"
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgresql+asyncpg://reunite:reunite@postgres:5432/reuniteai
      - DATABASE_URL_SYNC=postgresql://reunite:reunite@postgres:5432/reuniteai
      - REDIS_URL=redis://redis:6379/0

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod

  flower:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=http://$(curl -s ifconfig.me):8000
    ports:
      - "3000:3000"
EOF

sudo docker compose up -d --build
