#!/bin/bash
# AMR Service Platform - EC2 Deployment Script
# Run this on a fresh Ubuntu 22.04+ EC2 instance
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

echo "=== AMR Service Platform Deployment ==="

# 1. Install Node.js 20
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# 3. Install PM2 (process manager)
echo "Installing PM2..."
sudo npm install -g pm2

# 4. Clone repo (skip if already cloned)
if [ ! -d "/home/ubuntu/AMR-SERVICE" ]; then
  echo "Cloning repository..."
  cd /home/ubuntu
  git clone https://github.com/Sunnyhaebak/AMR-SERVICE.git
fi

cd /home/ubuntu/AMR-SERVICE

# 5. Install dependencies
echo "Installing backend dependencies..."
npm install --prefix backend

echo "Installing frontend dependencies..."
npm install --prefix frontend

# 6. Create .env and generate Prisma client
echo "Setting up environment..."
if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env not found. Create it manually with your DATABASE_URL and JWT_SECRET."
  echo "Example: cp backend/.env.example backend/.env && nano backend/.env"
  exit 1
fi
cd backend && npx prisma generate && cd ..

# 7. Build backend
echo "Building backend..."
npm run build --prefix backend

# 8. Build frontend
echo "Building frontend..."
npm run build --prefix frontend

# 9. Run migrations
echo "Running database migrations..."
cd backend && npx prisma migrate deploy && cd ..

# 10. Seed database (only first time - comment out after first run)
echo "Seeding database..."
cd backend && npx ts-node prisma/seed.ts && cd ..

# 11. Start backend with PM2
echo "Starting backend..."
pm2 delete amr-backend 2>/dev/null || true
pm2 start backend/dist/main.js --name amr-backend --env production

# 12. Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/amr-platform > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend - serve built React files
    location / {
        root /home/ubuntu/AMR-SERVICE/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy to NestJS
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/amr-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 13. PM2 startup (auto-restart on reboot)
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "=== Deployment Complete ==="
echo "App is live at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api"
echo ""
echo "PM2 commands:"
echo "  pm2 logs amr-backend    - View logs"
echo "  pm2 restart amr-backend - Restart backend"
echo "  pm2 status              - Check status"
