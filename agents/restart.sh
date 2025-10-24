#!/bin/bash

# --- Sync Shared Tools ---
echo "Syncing shared tools to all agents..."
AGENTS_TO_SYNC=(
    "alerts_snapshot_agent"
    "chat"
    "emergency_resources_agent"
    "forecast_agent"
    "hurricane_simulation_agent"
    "risk_analysis_agent"
    "risk_analysis_agent_v1"
)
SHARED_TOOLS_SOURCE="shared_tools"

for agent in "${AGENTS_TO_SYNC[@]}"; do
    AGENT_TOOLS_DEST="${agent}/tools"
    if [ -d "$AGENT_TOOLS_DEST" ]; then
        echo "  -> Syncing to ${AGENT_TOOLS_DEST}"
        cp "${SHARED_TOOLS_SOURCE}/__init__.py" "${AGENT_TOOLS_DEST}/"
        cp "${SHARED_TOOLS_SOURCE}/logging_utils.py" "${AGENT_TOOLS_DEST}/"
        cp "${SHARED_TOOLS_SOURCE}/tools.py" "${AGENT_TOOLS_DEST}/"
    else
        echo "  -> Warning: ${AGENT_TOOLS_DEST} not found. Skipping sync."
    fi
done
echo "Sync complete."
echo ""

# Stop all running agent services
echo "Stopping existing agent services..."
kill -9 $(lsof -t -i:8081) 2>/dev/null
kill -9 $(lsof -t -i:8082) 2>/dev/null
kill -9 $(lsof -t -i:8083) 2>/dev/null
kill -9 $(lsof -t -i:8084) 2>/dev/null
kill -9 $(lsof -t -i:8085) 2>/dev/null
kill -9 $(lsof -t -i:8090) 2>/dev/null
kill -9 $(lsof -t -i:8091) 2>/dev/null

# Clean old logs
echo "Cleaning old log files..."
make clean-logs

# Start all agent API servers in the background
# The `make agents` command handles most of them
echo "Starting all agent API servers..."
make agents


