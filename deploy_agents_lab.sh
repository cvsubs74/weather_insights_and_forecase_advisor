#!/bin/bash
# Script to deploy all weather agents to Google Cloud Run.

# Exit on error
set -e

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

    echo "-----------------------------------------------------"
    echo "Deploying $service_name..."
    echo "-----------------------------------------------------"

    # Deploy the self-contained agent directory.
    adk deploy cloud_run \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --service_name="$service_name" \
        --allow_origins="*" \
        --with_ui \
        "$agent_path"

    # Capture the URL of the deployed service
    local service_url=$(gcloud run services describe "$service_name" --platform managed --region "$REGION" --format 'value(status.url)')
    echo "✅ Successfully deployed $service_name to: $service_url"
    
    # Store URL for frontend .env file
    local env_var_name=$(echo "$service_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_URL
    echo "REACT_APP_$env_var_name=$service_url" >> frontend/.env.production
    echo "Exported $env_var_name to frontend/.env.production"
    echo ""
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

# 4. Loop through and deploy each agent
for agent_info in "${AGENTS_TO_DEPLOY[@]}"; do
    IFS=':' read -r service_name agent_path <<< "$agent_info"
    deploy_agent "$service_name" "$agent_path"
done

# 5. Final output
echo "====================================================="
echo "All agents deployed successfully!"
echo "The .env.production file has been created in the 'frontend' directory."
echo "You can now deploy the frontend using ./deploy_frontend_agents.sh"
echo "====================================================="
