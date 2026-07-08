#!/bin/bash
# Quick Test Runner Script for Health Fitness Coach

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Health Fitness Coach - Test Runner Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.10+${NC}"
    exit 1
fi

# Check Node
if ! command_exists npm; then
    echo -e "${YELLOW}⚠️  Node.js/npm not found. Frontend tests will be skipped.${NC}"
    HAS_NODE=0
else
    HAS_NODE=1
fi

# Parse command line arguments
TEST_TYPE=${1:-all}

# Backend Tests
run_backend_tests() {
    echo -e "${BLUE}➤ Running Backend Tests...${NC}"
    cd backend || exit 1
    
    # Install dependencies if needed
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        echo -e "${YELLOW}Installing Python dependencies...${NC}"
        pip install pytest pytest-asyncio pytest-cov >/dev/null 2>&1
    fi
    
    case $TEST_TYPE in
        all)
            echo -e "${YELLOW}Running all backend tests...${NC}"
            pytest -v --tb=short
            ;;
        quick)
            echo -e "${YELLOW}Running quick backend tests...${NC}"
            pytest -v --tb=short -x  # Stop on first failure
            ;;
        coverage)
            echo -e "${YELLOW}Running backend tests with coverage...${NC}"
            pytest --cov=. --cov-report=html --cov-report=term-missing
            echo -e "${GREEN}✅ Coverage report generated: htmlcov/index.html${NC}"
            ;;
        auth)
            echo -e "${YELLOW}Running authentication tests...${NC}"
            pytest tests/test_auth.py -v
            ;;
        api)
            echo -e "${YELLOW}Running API endpoint tests...${NC}"
            pytest tests/test_api_endpoints.py -v
            ;;
        models)
            echo -e "${YELLOW}Running model tests...${NC}"
            pytest tests/test_models.py -v
            ;;
        integration)
            echo -e "${YELLOW}Running integration tests...${NC}"
            pytest tests/test_integration.py -v
            ;;
        *)
            echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
            echo "Available: all, quick, coverage, auth, api, models, integration"
            exit 1
            ;;
    esac
    
    BACKEND_EXIT=$?
    cd ..
    return $BACKEND_EXIT
}

# Frontend Tests
run_frontend_tests() {
    if [ $HAS_NODE -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Skipping frontend tests (Node.js not installed)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}➤ Running Frontend Tests...${NC}"
    cd frontend || exit 1
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing Node dependencies...${NC}"
        npm install --silent
    fi
    
    case $TEST_TYPE in
        all)
            echo -e "${YELLOW}Running all frontend tests...${NC}"
            npm test -- --passWithNoTests
            ;;
        quick)
            echo -e "${YELLOW}Running quick frontend tests...${NC}"
            npm test -- --passWithNoTests --maxWorkers=1
            ;;
        coverage)
            echo -e "${YELLOW}Running frontend tests with coverage...${NC}"
            npm test -- --coverage --passWithNoTests
            echo -e "${GREEN}✅ Coverage report generated: coverage/index.html${NC}"
            ;;
        *)
            echo -e "${YELLOW}Running all frontend tests...${NC}"
            npm test -- --passWithNoTests
            ;;
    esac
    
    FRONTEND_EXIT=$?
    cd ..
    return $FRONTEND_EXIT
}

# Display usage
show_usage() {
    cat << EOF
${GREEN}Usage:${NC} ./run-tests.sh [test-type]

${GREEN}Test Types:${NC}
  all           Run all tests (backend + frontend)
  quick         Run quick tests (stop on first failure)
  coverage      Generate coverage reports
  auth          Backend authentication tests only
  api           Backend API endpoint tests only
  models        Backend database model tests only
  integration   Backend integration tests only

${GREEN}Examples:${NC}
  ./run-tests.sh all              # Run all tests
  ./run-tests.sh quick            # Quick test run
  ./run-tests.sh coverage         # With coverage report
  ./run-tests.sh auth             # Auth tests only

${GREEN}Environment:${NC}
  Python: $(python3 --version 2>&1)
  Node.js: $(node --version 2>&1 || echo "Not installed")
  npm: $(npm --version 2>&1 || echo "Not installed")
EOF
}

# Main execution
if [ "$TEST_TYPE" = "--help" ] || [ "$TEST_TYPE" = "-h" ]; then
    show_usage
    exit 0
fi

echo -e "${YELLOW}Test Type: ${TEST_TYPE}${NC}"
echo ""

# Run tests
BACKEND_EXIT=0
FRONTEND_EXIT=0

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "quick" ] || [ "$TEST_TYPE" = "coverage" ] || \
   [ "$TEST_TYPE" = "auth" ] || [ "$TEST_TYPE" = "api" ] || [ "$TEST_TYPE" = "models" ] || [ "$TEST_TYPE" = "integration" ]; then
    
    run_backend_tests
    BACKEND_EXIT=$?
    
    if [ $BACKEND_EXIT -ne 0 ]; then
        echo -e "${RED}❌ Backend tests failed!${NC}"
    else
        echo -e "${GREEN}✅ Backend tests passed!${NC}"
    fi
    
    echo ""
    
    if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "quick" ] || [ "$TEST_TYPE" = "coverage" ]; then
        run_frontend_tests
        FRONTEND_EXIT=$?
        
        if [ $FRONTEND_EXIT -ne 0 ] && [ $HAS_NODE -eq 1 ]; then
            echo -e "${RED}❌ Frontend tests failed!${NC}"
        else
            echo -e "${GREEN}✅ Frontend tests passed!${NC}"
        fi
    fi
else
    run_backend_tests
    BACKEND_EXIT=$?
fi

# Final summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Run Summary                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"

if [ $BACKEND_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Backend: PASSED${NC}"
else
    echo -e "${RED}❌ Backend: FAILED${NC}"
fi

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "quick" ] || [ "$TEST_TYPE" = "coverage" ]; then
    if [ $HAS_NODE -eq 1 ]; then
        if [ $FRONTEND_EXIT -eq 0 ]; then
            echo -e "${GREEN}✅ Frontend: PASSED${NC}"
        else
            echo -e "${RED}❌ Frontend: FAILED${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Frontend: SKIPPED (Node.js not installed)${NC}"
    fi
fi

echo ""

# Exit with error if any tests failed
if [ $BACKEND_EXIT -ne 0 ] || ([ "$TEST_TYPE" = "all" ] && [ $FRONTEND_EXIT -ne 0 ]); then
    exit 1
else
    echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
    exit 0
fi
