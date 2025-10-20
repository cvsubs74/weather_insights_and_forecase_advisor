#!/bin/bash

# Start Weather Insights Agent with ADK Web
cd "$(dirname "$0")"

echo "🌤️  Starting Weather Insights & Forecast Advisor Agent..."
echo "📍 Agent UI: http://localhost:8000"
echo "📍 React Frontend: http://localhost:3000"
echo ""

source .venv/bin/activate
adk web
