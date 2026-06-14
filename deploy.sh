#!/bin/bash
# ReStock-IQ Deployment Script for EC2
# Run this after cloning the repo on your EC2 instance

set -e

echo "═══ ReStock-IQ Deployment ═══"
echo ""

# Get project root
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "[1/5] Installing backend dependencies..."
cd backend
npm install --production
cd ..

echo "[2/5] Installing frontend dependencies..."
cd frontend
npm install
echo ""

echo "[3/5] Building frontend..."
npm run build
cd ..

echo "[4/5] Setting up environment..."
if [ ! -f backend/.env ]; then
  cat > backend/.env << 'EOF'
PORT=5000
JWT_SECRET=restock-iq-prod-secret-change-me
NODE_ENV=production
EOF
  echo "  Created backend/.env (edit JWT_SECRET!)"
else
  echo "  backend/.env already exists, skipping"
fi

echo "[5/5] Starting with PM2..."
if command -v pm2 &> /dev/null; then
  cd backend
  pm2 stop restock-iq 2>/dev/null || true
  pm2 start server.js --name restock-iq
  pm2 save
  echo ""
  echo "═══ Deployment Complete! ═══"
  echo ""
  pm2 status
else
  echo "  PM2 not installed. Install with: sudo npm install -g pm2"
  echo "  Then run: cd backend && pm2 start server.js --name restock-iq"
fi

echo ""
echo "Your app should be running on port 5000"
echo "Set up Nginx to proxy port 80 → 5000 (see DEPLOY.md)"
