#!/bin/bash

# SaaS Billing System Deployment Script
# This script provides easy deployment options for the microservices system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
            print_warning "Please edit .env file with your configuration before deployment"
        else
            print_error "env.example file not found"
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies for all services..."
    
    # Install root dependencies
    npm install
    
    # Install dependencies for each service
    local services=("customer-service" "subscription-service" "plan-service" "invoice-service" "auth-service" "api-gateway")
    
    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            print_status "Installing dependencies for $service..."
            cd "services/$service"
            npm install
            cd "../.."
            print_success "Dependencies installed for $service"
        else
            print_warning "Service directory not found: $service"
        fi
    done
    
    print_success "All dependencies installed"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    # Start infrastructure services first
    print_status "Starting infrastructure services (MongoDB, Redis)..."
    docker-compose up -d mongodb redis
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    # Start application services
    print_status "Starting application services..."
    docker-compose up -d
    
    print_success "All services started"
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            print_success "API Gateway is healthy"
            break
        else
            print_status "Waiting for services to be ready... (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Services failed to start properly"
        print_status "Checking service logs..."
        docker-compose logs --tail=20
        exit 1
    fi
    
    # Check individual service health
    local services=("customers" "subscriptions" "plans" "invoices" "auth")
    for service in "${services[@]}"; do
        if curl -s "http://localhost:3000/api/$service" >/dev/null 2>&1; then
            print_success "$service service is accessible"
        else
            print_warning "$service service may not be ready yet"
        fi
    done
}

# Function to show service information
show_info() {
    print_success "🎉 SaaS Billing System deployed successfully!"
    echo
    echo "📋 Service Information:"
    echo "  🌐 API Gateway:        http://localhost:3000"
    echo "  📚 API Documentation:  http://localhost:3000/api-docs"
    echo "  🏥 Health Check:       http://localhost:3000/health"
    echo "  🔍 Service Discovery:  http://localhost:3000/api/services"
    echo
    echo "🔧 Individual Services:"
    echo "  🧑 Customer Service:   http://localhost:3001"
    echo "  📋 Subscription:       http://localhost:3002"
    echo "  💼 Plan Service:       http://localhost:3003"
    echo "  🧾 Invoice Service:    http://localhost:3004"
    echo "  🔐 Auth Service:       http://localhost:3005"
    echo
    echo "💾 Infrastructure:"
    echo "  🗄️  MongoDB:           mongodb://localhost:27017"
    echo "  📨 Redis:              redis://localhost:6379"
    echo
    echo "🔑 Default Credentials:"
    echo "  📧 Email:              admin@saas-billing.com"
    echo "  🔒 Password:           admin123"
    echo
    echo "📖 Quick Commands:"
    echo "  View logs:             docker-compose logs -f"
    echo "  Stop services:         docker-compose down"
    echo "  Restart services:      docker-compose restart"
    echo "  Check status:          docker-compose ps"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    docker-compose down -v
    docker system prune -f
    print_success "Cleanup completed"
}

# Main deployment function
deploy() {
    print_status "Starting SaaS Billing System deployment..."
    
    check_prerequisites
    setup_environment
    install_dependencies
    build_images
    start_services
    check_health
    show_info
}

# Function to show help
show_help() {
    echo "SaaS Billing System Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy     Deploy the complete system (default)"
    echo "  start      Start services (assumes images are built)"
    echo "  stop       Stop all services"
    echo "  restart    Restart all services"
    echo "  logs       Show service logs"
    echo "  status     Show service status"
    echo "  cleanup    Stop services and cleanup"
    echo "  health     Check service health"
    echo "  help       Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy          # Full deployment"
    echo "  $0 start           # Start services only"
    echo "  $0 logs            # View logs"
    echo "  $0 cleanup         # Cleanup everything"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        start_services
        check_health
        show_info
        ;;
    "stop")
        print_status "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        check_health
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "cleanup")
        cleanup
        ;;
    "health")
        check_health
        ;;
    "help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 