#!/bin/bash

# Start the Weather Insights Agent
# This uses adk web which provides a web UI and API endpoints

cd "$(dirname "$0")"

echo "Starting Weather Insights & Forecast Advisor Agent..."
echo "Agent will be available at: http://localhost:8000"
echo ""
echo "Note: Use 'adk web' for development with web UI"
echo "      The React frontend at localhost:3000 will need to be updated to use the web UI endpoints"
echo ""

source ../../../.venv/bin/activate
adk web
