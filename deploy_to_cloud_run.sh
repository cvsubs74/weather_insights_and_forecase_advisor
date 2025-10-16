#!/bin/bash
# Script to deploy the BigQuery agent to Google Cloud Run

# Exit on error
set -e

# Configuration - modify these variables as needed
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"qwiklabs-gcp-02-c417a7c7752d"}  # Default from environment or replace with your project ID
REGION=${GOOGLE_CLOUD_LOCATION:-"us-central1"}  # Default from environment or replace with your preferred region
SERVICE_NAME="weather-insights-and-forecast-advisor"
AGENT_PATH=$(dirname "$0")  # Path to the agent directory

# Display configuration
echo "Deployment Configuration:"
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

# Deploy using ADK CLI
echo "Deploying BigQuery agent to Cloud Run..."
adk deploy cloud_run \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --service_name="$SERVICE_NAME" \
    --with_ui \
    "$AGENT_PATH"

echo "Deployment completed!"
echo "You can access the agent UI at the URL provided above."
echo "To test the agent API, you can use: curl https://$SERVICE_NAME-[hash].a.run.app/health"
