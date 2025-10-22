#!/bin/bash

# Weather Insights Frontend Startup Script
# Kills any existing process on port 3000 and starts the React app

PORT=3000

echo "🔍 Checking for existing processes on port $PORT..."

# Find and kill any process using port 3000
PID=$(lsof -ti:$PORT)

if [ ! -z "$PID" ]; then
    echo "⚠️  Found process $PID running on port $PORT"
    echo "🔪 Killing process $PID..."
    kill -9 $PID 2>/dev/null
    sleep 1
    echo "✅ Process killed successfully"
else
    echo "✅ Port $PORT is available"
fi

echo "🚀 Starting Weather Insights UI..."
npm start
