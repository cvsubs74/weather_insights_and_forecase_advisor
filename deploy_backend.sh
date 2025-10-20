#!/bin/bash
# Script to deploy ONLY the backend agent to Google Cloud Run (no UI)

# Exit on error
set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"graph-rag-app-20250811"}
REGION=${GOOGLE_CLOUD_LOCATION:-"us-central1"}
SERVICE_NAME="weather-insights-agent"
AGENT_PATH="weather_insights_agent"

# Display configuration
echo "Backend Deployment Configuration:"
echo "------------------------"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo "Agent Path: $AGENT_PATH"
echo "------------------------"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if adk is installed
if ! command -v adk &> /dev/null; then
    echo "Error: ADK CLI is not installed. Please install it first."
    exit 1
fi

# Authenticate with Google Cloud if needed
echo "Checking authentication..."
if ! gcloud auth print-identity-token &> /dev/null; then
    echo "Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set the project
echo "Setting Google Cloud project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Deploy using ADK CLI WITHOUT --with_ui flag
# .env file in weather_insights_agent/ will be automatically included
echo "Deploying Weather Insights backend agent to Cloud Run..."
adk deploy cloud_run \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --service_name="$SERVICE_NAME" \
    --allow_origins="*" \
    "$AGENT_PATH"

echo ""
echo "Backend deployment completed!"
echo "Backend API URL will be displayed above."
echo "Environment variables loaded from weather_insights_agent/.env"
echo "To test the backend: curl https://$SERVICE_NAME-[hash].a.run.app/health"
