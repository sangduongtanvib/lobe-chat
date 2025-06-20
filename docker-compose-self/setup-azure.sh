#!/bin/bash

# Setup Nginx Reverse Proxy for Azure (HTTP Only)
# Usage: ./setup-azure.sh

echo "=== LobeChat Azure Setup ==="
echo "Setting up Nginx reverse proxy for Azure deployment (HTTP only)"

# Get domains from user
read -p "Main domain (e.g., example.com): " MAIN_DOMAIN
read -p "Auth subdomain (e.g., auth.example.com): " AUTH_DOMAIN  
read -p "MinIO API subdomain (e.g., minio.example.com): " MINIO_DOMAIN
read -p "MinIO Console subdomain (e.g., minio-console.example.com): " CONSOLE_DOMAIN

# Create HTTP-only nginx config
echo "Creating nginx configuration..."
cp nginx-proxy-http.conf nginx-azure.conf

# Replace domains in config
sed -i "s/your-domain.com/${MAIN_DOMAIN}/g" nginx-azure.conf
sed -i "s/auth.your-domain.com/${AUTH_DOMAIN}/g" nginx-azure.conf
sed -i "s/minio.your-domain.com/${MINIO_DOMAIN}/g" nginx-azure.conf
sed -i "s/minio-console.your-domain.com/${CONSOLE_DOMAIN}/g" nginx-azure.conf

echo "✅ Nginx configuration created: nginx-azure.conf"

# Install nginx config
if [ -d "/etc/nginx/sites-available" ]; then
    echo "Installing nginx configuration..."
    sudo cp nginx-azure.conf /etc/nginx/sites-available/lobe-chat
    sudo ln -sf /etc/nginx/sites-available/lobe-chat /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx configuration has errors"
        exit 1
    fi
else
    echo "⚠️  /etc/nginx/sites-available not found"
    echo "Please manually copy nginx-azure.conf to your nginx configuration directory"
fi

# Show final instructions
echo ""
echo "=== Setup Complete ==="
echo "Make sure your Azure DNS/Load Balancer points these domains to this server:"
echo "  ${MAIN_DOMAIN} → Port 80"
echo "  ${AUTH_DOMAIN} → Port 80" 
echo "  ${MINIO_DOMAIN} → Port 80"
echo "  ${CONSOLE_DOMAIN} → Port 80"
echo ""
echo "Your LobeChat services will be available at:"
echo "  Main App: http://${MAIN_DOMAIN}"
echo "  Auth: http://${AUTH_DOMAIN}"
echo "  MinIO API: http://${MINIO_DOMAIN}"
echo "  MinIO Console: http://${CONSOLE_DOMAIN}"
echo ""
echo "Next steps:"
echo "1. Run './setup.sh' and choose domain mode"
echo "2. Use HTTP protocol (not HTTPS)"
echo "3. Enter the domains you just configured"
echo "4. Start LobeChat: docker-compose up -d" 