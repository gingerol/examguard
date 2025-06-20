#!/bin/bash

# ExamGuard Docker Setup Test Script
echo "🧪 Testing ExamGuard Docker Setup..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test a condition
test_condition() {
    local test_name="$1"
    local command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test if Docker is running
test_condition "Docker daemon" "docker ps"

# Test if containers are running
test_condition "MongoDB container" "docker ps | grep ai-proctor-mongodb"
test_condition "Backend container" "docker ps | grep ai-proctor-backend"
test_condition "Frontend container" "docker ps | grep ai-proctor-frontend"

# Test port accessibility
test_condition "MongoDB port (27017)" "nc -z localhost 27017"
test_condition "Backend port (5000)" "nc -z localhost 5000"
test_condition "Frontend port (3002)" "nc -z localhost 3002"

# Test HTTP endpoints
test_condition "Backend health" "curl -s http://localhost:5000/api/health | grep -q 'ok'"
test_condition "Frontend accessibility" "curl -s http://localhost:3002 | grep -q 'html'"

# Test MongoDB connection
test_condition "MongoDB connection" "docker exec ai-proctor-mongodb mongosh --quiet --eval 'db.runCommand(\"ping\").ok'"

# Test backend API endpoints
test_condition "Backend API health" "curl -s http://localhost:5000/api/health | grep -q 'running'"

echo ""
echo "=================================="
echo "Test Results:"
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Your ExamGuard setup is working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create an admin user:"
    echo "   curl -X POST http://localhost:5000/register -H 'Content-Type: application/json' -d '{\"username\": \"admin\", \"password\": \"admin123\", \"role\": \"admin\"}'"
    echo ""
    echo "2. Access the frontend at: http://localhost:3002"
    echo "3. Login with username: admin, password: admin123"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the following:${NC}"
    echo ""
    echo "1. Ensure Docker is running: docker ps"
    echo "2. Start the services: docker compose up -d"
    echo "3. Check logs: docker compose logs"
    echo "4. Wait a few minutes for services to fully start"
    echo ""
fi

exit $TESTS_FAILED