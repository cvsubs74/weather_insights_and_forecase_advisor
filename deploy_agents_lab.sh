#!/bin/bash
# Script to deploy all weather agents to Google Cloud Run in parallel.

# Exit on error (but allow background jobs to fail individually)
set -e

# Track background job PIDs and results
declare -a DEPLOY_PIDS
declare -a DEPLOY_NAMES
declare -a DEPLOY_RESULTS

# --- Configuration ---
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"qwiklabs-gcp-00-a9c5a88b38c5"}
REGION=${GOOGLE_CLOUD_LOCATION:-"us-central1"}

# List of agents to deploy
# Format: "<service-name>:<path-to-agent-directory>"
AGENTS_TO_DEPLOY=(
    "weather-alerts-snapshot-agent:agents/alerts_snapshot_agent"
    "weather-emergency-resources-agent:agents/emergency_resources_agent"
    "weather-forecast-agent:agents/forecast_agent"
    "weather-risk-analysis-agent:agents/risk_analysis_agent"
    "weather-hurricane-simulation-agent:agents/hurricane_simulation_agent"
    "weather-chat-agent:agents/chat"
)

# --- Helper Functions ---
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 CLI is not installed. Please install it first." >&2
        exit 1
    fi
}

deploy_agent() {
    local service_name="$1"
    local agent_path="$2"
    local log_file="$3"

    {
        echo "-----------------------------------------------------"
        echo "Deploying $service_name..."
        echo "-----------------------------------------------------"

        # Deploy the self-contained agent directory.
        if adk deploy cloud_run \
            --project="$PROJECT_ID" \
            --region="$REGION" \
            --service_name="$service_name" \
            --allow_origins="*" \
            --with_ui \
            "$agent_path" 2>&1; then
            
            # Capture the URL of the deployed service
            local service_url=$(gcloud run services describe "$service_name" --platform managed --region "$REGION" --format 'value(status.url)' 2>&1)
            echo "✅ Successfully deployed $service_name to: $service_url"
            
            # Store URL for frontend .env file (with lock to prevent race conditions)
            local env_var_name=$(echo "$service_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_URL
            
            # Use a simple lock mechanism that works on macOS
            local lockfile="/tmp/deploy_env_${service_name}.lock"
            while ! mkdir "$lockfile" 2>/dev/null; do
                sleep 0.1
            done
            
            echo "REACT_APP_$env_var_name=$service_url" >> frontend/.env.production
            rmdir "$lockfile"
            
            echo "Exported $env_var_name to frontend/.env.production"
            echo "SUCCESS"
        else
            echo "❌ Failed to deploy $service_name"
            echo "FAILED"
            exit 1
        fi
    } > "$log_file" 2>&1
}

# --- Main Execution ---

# 1. Check prerequisites
check_command "gcloud"
check_command "adk"

# 2. Authenticate and set project
echo "Authenticating and setting Google Cloud project..."
gcloud auth login
gcloud config set project "$PROJECT_ID"

# 3. Clear previous production env file for the frontend
if [ -f "frontend/.env.production" ]; then
    echo "Clearing old frontend/.env.production file..."
    rm frontend/.env.production
fi
touch frontend/.env.production

# 4. Create logs directory
mkdir -p deploy_logs
rm -f deploy_logs/*.log

# 5. Deploy all agents in parallel
echo "====================================================="
echo "🚀 Starting parallel deployment of ${#AGENTS_TO_DEPLOY[@]} agents..."
echo "====================================================="
echo ""

for agent_info in "${AGENTS_TO_DEPLOY[@]}"; do
    IFS=':' read -r service_name agent_path <<< "$agent_info"
    log_file="deploy_logs/${service_name}.log"
    
    echo "📦 Starting deployment: $service_name (logs: $log_file)"
    
    # Deploy in background
    deploy_agent "$service_name" "$agent_path" "$log_file" &
    
    # Track the PID and name
    DEPLOY_PIDS+=($!)
    DEPLOY_NAMES+=("$service_name")
    
    # Small delay to avoid temp directory conflicts
    sleep 2
done

echo ""
echo "⏳ All deployments started. Waiting for completion..."
echo "   (You can tail logs in deploy_logs/ directory)"
echo ""

# 6. Wait for all background jobs and collect results
failed_count=0
success_count=0

for i in "${!DEPLOY_PIDS[@]}"; do
    pid=${DEPLOY_PIDS[$i]}
    name=${DEPLOY_NAMES[$i]}
    log_file="deploy_logs/${name}.log"
    
    # Wait for this specific job
    if wait "$pid"; then
        echo "✅ $name - Deployment completed successfully"
        ((success_count++))
    else
        echo "❌ $name - Deployment failed (check $log_file for details)"
        ((failed_count++))
    fi
done

echo ""
echo "====================================================="
echo "📊 Deployment Summary:"
echo "   ✅ Successful: $success_count"
echo "   ❌ Failed: $failed_count"
echo "   📝 Total: ${#AGENTS_TO_DEPLOY[@]}"
echo "====================================================="

if [ $failed_count -gt 0 ]; then
    echo ""
    echo "⚠️  Some deployments failed. Check logs in deploy_logs/ directory"
    echo "Failed agents:"
    for i in "${!DEPLOY_PIDS[@]}"; do
        pid=${DEPLOY_PIDS[$i]}
        name=${DEPLOY_NAMES[$i]}
        if ! wait "$pid" 2>/dev/null; then
            echo "   - $name (deploy_logs/${name}.log)"
        fi
    done
    exit 1
fi

echo ""
echo "✅ All agents deployed successfully!"
echo "The .env.production file has been created in the 'frontend' directory."
echo "You can now deploy the frontend using ./deploy_frontend_lab.sh"
echo "====================================================="
