#!/bin/bash

# Test script for multi-agent system

echo "Testing Multi-Agent System"
echo "=========================="
echo ""

# Test Alerts Agent
echo "1. Testing Alerts Snapshot Agent (8081)..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8081/apps/alerts_snapshot_agent/users/test_user/sessions \
  -H "Content-Type: application/json" \
  -d '{"state": {}}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Created session: $SESSION_ID"

ALERTS_RESPONSE=$(curl -s -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d "{\"app_name\": \"alerts_snapshot_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Get alerts for California\"}]}, \"streaming\": false}")

echo "   Response: ${ALERTS_RESPONSE:0:200}..."
echo ""

# Test Forecast Agent
echo "2. Testing Forecast Agent (8082)..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8082/apps/forecast_agent/users/test_user/sessions \
  -H "Content-Type: application/json" \
  -d '{"state": {}}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Created session: $SESSION_ID"

FORECAST_RESPONSE=$(curl -s -X POST http://localhost:8082/run \
  -H "Content-Type: application/json" \
  -d "{\"app_name\": \"forecast_agent\", \"user_id\": \"test_user\", \"session_id\": \"$SESSION_ID\", \"new_message\": {\"role\": \"user\", \"parts\": [{\"text\": \"Get forecast for San Francisco\"}]}, \"streaming\": false}")

echo "   Response: ${FORECAST_RESPONSE:0:200}..."
echo ""

echo "Testing complete!"
echo ""
echo "To view agent logs, check the terminal where 'make run-agents' is running"
echo "Or run: tail -f agents/*.log (if logging to files)"
