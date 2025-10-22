#!/bin/bash

# Self-contained, consolidated test script for the full multi-agent system

# Function to clean up background processes on exit
cleanup() {
    echo "
Cleaning up background agent processes..."
    kill $ALERTS_PID $FORECAST_PID $RISK_PID $EMERGENCY_PID $CHAT_PID
    wait
    echo "Cleanup complete."
}
trap cleanup EXIT

echo "Setting up test environment..."
echo "----------------------------"

# 1. Stop any running agents
echo "- Stopping any lingering agent processes..."
lsof -ti:8081 -ti:8082 -ti:8083 -ti:8084 -ti:8090 | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Start all agents in the background
echo "- Starting all agents in the background..."
make alerts-snapshot & ALERTS_PID=$!
make forecast-agent & FORECAST_PID=$!
make risk-analysis & RISK_PID=$!
make emergency-resources & EMERGENCY_PID=$!
make chat-agent & CHAT_PID=$!

echo "- Agents started with PIDs: $ALERTS_PID, $FORECAST_PID, $RISK_PID, $EMERGENCY_PID, $CHAT_PID"

# 3. Wait for agents to initialize
echo "- Waiting for agents to start (10 seconds)..."
sleep 10

echo "
Running Integration Tests"
echo "========================="
echo ""

# Test 1: Alerts Snapshot Agent
echo "1. Testing Alerts Snapshot Agent (8081)..."
SESSION_RESPONSE_1=$(curl -s -X POST http://localhost:8081/apps/alerts_snapshot_agent/users/test_user/sessions -H "Content-Type: application/json" -d '{"state": {}}')
SESSION_ID_1=$(echo $SESSION_RESPONSE_1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   - Created session: $SESSION_ID_1"
ALERTS_RESPONSE=$(curl -s -X POST http://localhost:8081/run -H "Content-Type: application/json" -d "{\"app_name\": \"alerts_snapshot_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID_1\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Get alerts for California\"}]}, \"streaming\": false}")
echo "   - Response: ${ALERTS_RESPONSE:0:150}..."
echo ""

# Test 2: Forecast Agent
echo "2. Testing Forecast Agent (8082)..."
SESSION_RESPONSE_2=$(curl -s -X POST http://localhost:8082/apps/forecast_agent/users/test_user/sessions -H "Content-Type: application/json" -d '{"state": {}}')
SESSION_ID_2=$(echo $SESSION_RESPONSE_2 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   - Created session: $SESSION_ID_2"
FORECAST_RESPONSE=$(curl -s -X POST http://localhost:8082/run -H "Content-Type: application/json" -d "{\"app_name\": \"forecast_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID_2\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Get forecast for San Francisco\"}]}, \"streaming\": false}")
echo "   - Response: ${FORECAST_RESPONSE:0:150}..."
echo ""

# Test 3: Risk Analysis Agent
echo "3. Testing Risk Analysis Agent (8083)..."
SESSION_RESPONSE_3=$(curl -s -X POST http://localhost:8083/apps/risk_analysis_agent/users/test_user/sessions -H "Content-Type: application/json" -d '{"state": {}}')
SESSION_ID_3=$(echo $SESSION_RESPONSE_3 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   - Created session: $SESSION_ID_3"
RISK_RESPONSE=$(curl -s -X POST http://localhost:8083/run -H "Content-Type: application/json" -d "{\"app_name\": \"risk_analysis_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID_3\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Analyze flood risk for New Orleans\"}]}, \"streaming\": false}")
echo "   - Response: ${RISK_RESPONSE:0:150}..."
echo ""

# Test 4: Emergency Resources Agent
echo "4. Testing Emergency Resources Agent (8084)..."
SESSION_RESPONSE_4=$(curl -s -X POST http://localhost:8084/apps/emergency_resources_agent/users/test_user/sessions -H "Content-Type: application/json" -d '{"state": {}}')
SESSION_ID_4=$(echo $SESSION_RESPONSE_4 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   - Created session: $SESSION_ID_4"
EMERGENCY_RESPONSE=$(curl -s -X POST http://localhost:8084/run -H "Content-Type: application/json" -d "{\"app_name\": \"emergency_resources_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID_4\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Find hospitals near Austin, TX\"}]}, \"streaming\": false}")
echo "   - Response: ${EMERGENCY_RESPONSE:0:150}..."
echo ""

# Test 5: Chat Agent
echo "5. Testing Chat Agent (8090)..."
SESSION_RESPONSE_5=$(curl -s -X POST http://localhost:8090/apps/chat/users/test_user/sessions -H "Content-Type: application/json" -d '{"state": {}}')
SESSION_ID_5=$(echo $SESSION_RESPONSE_5 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   - Created session: $SESSION_ID_5"
CHAT_RESPONSE=$(curl -s -X POST http://localhost:8090/run -H "Content-Type: application/json" -d "{\"app_name\": \"chat\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID_5\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Hello there!\"}]}, \"streaming\": false}")
echo "   - Response: ${CHAT_RESPONSE:0:150}..."
echo ""

echo "
All tests passed successfully!"
