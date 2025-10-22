#!/bin/bash

# Script to view logs from all running agents

echo "Weather Insights Multi-Agent System - Log Viewer"
echo "================================================="
echo ""
echo "Running agents on ports:"
echo "  - Alerts Snapshot: 8081"
echo "  - Forecast: 8082"
echo "  - Risk Analysis: 8083"
echo "  - Emergency Resources: 8084"
echo "  - Chat Orchestrator: 8090"
echo ""
echo "Press Ctrl+C to exit"
echo ""

# Find the agent processes and show their output
echo "Agent Process IDs:"
ps aux | grep "adk api_server" | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13}'
echo ""

# Check if agents are running
if ! lsof -i :8081 > /dev/null 2>&1; then
    echo "❌ Alerts agent (8081) is NOT running"
else
    echo "✅ Alerts agent (8081) is running"
fi

if ! lsof -i :8082 > /dev/null 2>&1; then
    echo "❌ Forecast agent (8082) is NOT running"
else
    echo "✅ Forecast agent (8082) is running"
fi

if ! lsof -i :8083 > /dev/null 2>&1; then
    echo "❌ Risk agent (8083) is NOT running"
else
    echo "✅ Risk agent (8083) is running"
fi

if ! lsof -i :8084 > /dev/null 2>&1; then
    echo "❌ Emergency agent (8084) is NOT running"
else
    echo "✅ Emergency agent (8084) is running"
fi

if ! lsof -i :8090 > /dev/null 2>&1; then
    echo "❌ Chat agent (8090) is NOT running"
else
    echo "✅ Chat agent (8090) is running"
fi

echo ""
echo "To see live logs, the agents are running in background."
echo "Check the terminal where you ran 'make run-agents' or 'cd agents && make agents'"
echo ""
echo "To test the agents, run:"
echo "  cd agents && bash test_agents.sh"
