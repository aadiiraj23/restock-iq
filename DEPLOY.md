# Deploying ReStock-IQ on AWS Free Tier

## Architecture
- **Single EC2 t2.micro** instance runs both the backend API and serves the frontend build
- No database needed (data loaded from JSON file)
- Cost: $0 for 12 months (free tier)

---

## Prerequisites
- AWS account (free tier eligible)
- Git installed locally
- Your project pushed to a GitHub/GitLab repo

---

## Step 1: Launch an EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: `restock-iq`
   - **AMI**: Amazon Linux 2023 (free tier eligible)
   - **Instance type**: `t2.micro` (free tier)
   - **Key pair**: Create a new one (download the `.pem` file — you'll need it to SSH)
   - **Network settings**: 
     - Allow SSH (port 22) from your IP
     - Allow HTTP (port 80) from anywhere
     - Allow Custom TCP port 5000 from anywhere
   - **Storage**: 8 GB gp3 (free tier)
3. Click **Launch Instance**

---

## Step 2: Connect to Your Instance

```bash
# On your local machine (replace with your .pem file and EC2 public IP)
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@<YOUR-EC2-PUBLIC-IP>
```

---

## Step 3: Install Node.js on EC2

```bash
# Install Node.js 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Verify
node --version
npm --version
```

---

## Step 4: Clone & Set Up the Project

```bash
# Clone your repo
git clone <YOUR-REPO-URL> restock-iq
cd restock-iq

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies and build
cd ../frontend
npm install
npm run build

# Go back to backend
cd ../backend
```

---

## Step 5: Configure Environment

```bash
# Create production .env
cat > .env << 'EOF'
PORT=5000
JWT_SECRET=your-strong-secret-key-change-this-in-production
NODE_ENV=production
EOF
```

---

## Step 6: Run with PM2 (Process Manager)

PM2 keeps your app running and restarts it if it crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
cd ~/restock-iq/backend
pm2 start server.js --name restock-iq

# Make it survive reboots
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs restock-iq
```

---

## Step 7: Set Up Nginx as Reverse Proxy (Port 80 → 5000)

```bash
# Install Nginx
sudo yum install -y nginx

# Configure
sudo tee /etc/nginx/conf.d/restock-iq.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remove default config if it conflicts
sudo rm -f /etc/nginx/conf.d/default.conf

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test
curl http://localhost
```

---

## Step 8: Access Your App

Your app is now live at:
```
http://<YOUR-EC2-PUBLIC-IP>
```

---

## Optional: Add a Free Domain + HTTPS

### Free domain options:
- Use EC2's public DNS (e.g., `ec2-xx-xx-xx-xx.region.compute.amazonaws.com`)
- Get a free domain from Freenom or use a subdomain from freedns.afraid.org

### Add HTTPS with Let's Encrypt (free):
```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot-renew.timer
```

---

## Quick Reference Commands

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@<IP>

# View logs
pm2 logs restock-iq

# Restart after code changes
cd ~/restock-iq
git pull
cd frontend && npm run build && cd ../backend
pm2 restart restock-iq

# Check status
pm2 status
```

---

## Cost Breakdown (Free Tier - 12 months)

| Service     | Usage              | Cost   |
|-------------|-------------------|--------|
| EC2 t2.micro| 750 hrs/month     | $0     |
| EBS 8GB     | Storage           | $0     |
| Data transfer| 15 GB/month out  | $0     |
| **Total**   |                   | **$0** |

---

## Troubleshooting

**App not responding:**
```bash
pm2 logs restock-iq --lines 50
```

**Port 80 not working:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

**Can't connect to EC2:**
- Check Security Group allows inbound on port 22, 80
- Check the instance is running

**Frontend not loading:**
```bash
ls ~/restock-iq/frontend/dist/index.html  # Should exist
pm2 restart restock-iq
```
