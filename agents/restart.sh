#!/bin/bash

# Stop all running agent services
echo "Stopping existing agent services..."
kill -9 $(lsof -t -i:8081) 2>/dev/null
kill -9 $(lsof -t -i:8082) 2>/dev/null
kill -9 $(lsof -t -i:8083) 2>/dev/null
kill -9 $(lsof -t -i:8084) 2>/dev/null
kill -9 $(lsof -t -i:8090) 2>/dev/null
kill -9 $(lsof -t -i:8091) 2>/dev/null

# Clean old logs
echo "Cleaning old log files..."
make clean-logs

# Start all agent API servers in the background
# The `make agents` command handles most of them
echo "Starting all agent API servers..."
make agents

# The `make agents` target does not include the log analyzer, so start it separately
PYTHONPATH=$(pwd) ../.venv/bin/adk api_server log_analyzer_agent --allow_origins="*" --port=8091 >> log_analyzer_agent.log 2>&1 &
echo "Log Analyzer Agent started on port 8091."

