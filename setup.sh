#!/bin/bash

# Health Fitness Coach - Quick Start Script
# This script sets up and runs the entire project

set -e  # Exit on error

echo "🏋️ Health Fitness Coach - Quick Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if [ "$(printf '%s\n' "3.11" "$PYTHON_VERSION" | sort -V | head -n1)" = "3.11" ]; then
    echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠️  Python $PYTHON_VERSION found (recommending 3.11+)${NC}"
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ Node $(node --version) found${NC}"
else
    echo -e "${RED}❌ Node.js 18+ required, found $(node --version)${NC}"
    exit 1
fi

echo ""
echo "🔧 Setting up backend..."

# Setup backend
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your API keys${NC}"
    echo "   - OPENAI_API_KEY"
    echo "   - (Optional) ANTHROPIC_API_KEY"
fi

cd ..

echo -e "${GREEN}✅ Backend setup complete${NC}"

echo ""
echo "🎨 Setting up frontend..."

# Setup frontend
cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install -q
fi

# Create .env.local if not exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
PYTHON_API_URL=http://localhost:8000
EOF
fi

cd ..

echo -e "${GREEN}✅ Frontend setup complete${NC}"

echo ""
echo "🚀 Ready to start!"
echo ""
echo "To run the application:"
echo "========================"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  source venv/bin/activate  # or venv\\Scripts\\activate on Windows"
echo "  python -m uvicorn api.main:app --reload"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo -e "${YELLOW}Important: Add your OpenAI API key to backend/.env${NC}"
