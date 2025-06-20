#!/bin/bash

# Setup Reverse Proxy for LobeChat
# Usage: ./setup-reverse-proxy.sh [nginx|caddy|traefik]

PROXY_TYPE=${1:-nginx}
DOMAIN=""
MINIO_DOMAIN=""
AUTH_DOMAIN=""
CONSOLE_DOMAIN=""
EMAIL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get user input
get_domains() {
    echo "Please enter your domains:"
    read -p "Main domain (e.g., example.com): " DOMAIN
    read -p "Auth domain (e.g., auth.example.com): " AUTH_DOMAIN
    read -p "MinIO API domain (e.g., minio.example.com): " MINIO_DOMAIN
    read -p "MinIO Console domain (e.g., minio-console.example.com): " CONSOLE_DOMAIN
    read -p "Email for SSL certificates: " EMAIL
}

# Setup Nginx
setup_nginx() {
    print_status "Setting up Nginx reverse proxy..."
    
    # Replace placeholders in nginx config
    sed -i "s/your-domain.com/${DOMAIN}/g" nginx-proxy.conf
    sed -i "s/auth.your-domain.com/${AUTH_DOMAIN}/g" nginx-proxy.conf
    sed -i "s/minio.your-domain.com/${MINIO_DOMAIN}/g" nginx-proxy.conf
    sed -i "s/minio-console.your-domain.com/${CONSOLE_DOMAIN}/g" nginx-proxy.conf
    
    # Install certbot if not exists
    if ! command -v certbot &> /dev/null; then
        print_warning "Certbot not found. Please install it for SSL certificates."
        print_status "Ubuntu/Debian: sudo apt install certbot python3-certbot-nginx"
        print_status "CentOS/RHEL: sudo yum install certbot python3-certbot-nginx"
    fi
    
    # Copy to nginx sites-available
    if [ -d "/etc/nginx/sites-available" ]; then
        sudo cp nginx-proxy.conf /etc/nginx/sites-available/lobe-chat
        sudo ln -sf /etc/nginx/sites-available/lobe-chat /etc/nginx/sites-enabled/
        print_success "Nginx configuration installed"
        
        # Test nginx configuration
        if sudo nginx -t; then
            print_success "Nginx configuration is valid"
            sudo systemctl reload nginx
            print_success "Nginx reloaded"
        else
            print_error "Nginx configuration has errors"
            return 1
        fi
    else
        print_warning "Nginx sites-available directory not found"
        print_status "Please manually copy nginx-proxy.conf to your nginx configuration directory"
    fi
    
    # Generate SSL certificates
    print_status "To generate SSL certificates, run:"
    echo "sudo certbot --nginx -d ${DOMAIN} -d ${AUTH_DOMAIN} -d ${MINIO_DOMAIN} -d ${CONSOLE_DOMAIN} --email ${EMAIL}"
}

# Setup Caddy
setup_caddy() {
    print_status "Setting up Caddy reverse proxy..."
    
    # Replace placeholders in Caddyfile
    sed -i "s/your-domain.com/${DOMAIN}/g" Caddyfile
    sed -i "s/auth.your-domain.com/${AUTH_DOMAIN}/g" Caddyfile
    sed -i "s/minio.your-domain.com/${MINIO_DOMAIN}/g" Caddyfile
    sed -i "s/minio-console.your-domain.com/${CONSOLE_DOMAIN}/g" Caddyfile
    
    # Install Caddy if not exists
    if ! command -v caddy &> /dev/null; then
        print_warning "Caddy not found. Please install it first."
        print_status "Installation: https://caddyserver.com/docs/install"
        return 1
    fi
    
    # Validate Caddyfile
    if caddy validate --config Caddyfile; then
        print_success "Caddyfile is valid"
        
        # Copy to system location
        sudo cp Caddyfile /etc/caddy/Caddyfile
        sudo systemctl reload caddy
        print_success "Caddy configuration updated and reloaded"
    else
        print_error "Caddyfile has errors"
        return 1
    fi
}

# Setup Traefik
setup_traefik() {
    print_status "Setting up Traefik reverse proxy..."
    
    # Replace placeholders in traefik configs
    sed -i "s/your-domain.com/${DOMAIN}/g" docker-compose-traefik.yml
    sed -i "s/auth.your-domain.com/${AUTH_DOMAIN}/g" docker-compose-traefik.yml
    sed -i "s/minio.your-domain.com/${MINIO_DOMAIN}/g" docker-compose-traefik.yml
    sed -i "s/minio-console.your-domain.com/${CONSOLE_DOMAIN}/g" docker-compose-traefik.yml
    sed -i "s/traefik.your-domain.com/traefik.${DOMAIN}/g" docker-compose-traefik.yml
    
    sed -i "s/your-email@example.com/${EMAIL}/g" traefik.yml
    
    # Create acme.json with correct permissions
    touch acme.json
    chmod 600 acme.json
    
    # Create traefik network
    docker network create traefik-network 2>/dev/null || true
    
    print_success "Traefik configuration ready"
    print_status "Start Traefik with: docker-compose -f docker-compose-traefik.yml up -d"
}

# Main setup
main() {
    print_status "LobeChat Reverse Proxy Setup"
    print_status "Selected proxy: $PROXY_TYPE"
    
    get_domains
    
    case $PROXY_TYPE in
        nginx)
            setup_nginx
            ;;
        caddy)
            setup_caddy
            ;;
        traefik)
            setup_traefik
            ;;
        *)
            print_error "Unsupported proxy type: $PROXY_TYPE"
            print_status "Supported types: nginx, caddy, traefik"
            exit 1
            ;;
    esac
    
    print_success "Reverse proxy setup completed!"
    print_status "Make sure your DNS records point to this server:"
    echo "  ${DOMAIN} → $(curl -s ifconfig.me)"
    echo "  ${AUTH_DOMAIN} → $(curl -s ifconfig.me)"
    echo "  ${MINIO_DOMAIN} → $(curl -s ifconfig.me)"
    echo "  ${CONSOLE_DOMAIN} → $(curl -s ifconfig.me)"
}

# Check if running as root for some operations
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Some operations may require different permissions."
fi

main "$@" 