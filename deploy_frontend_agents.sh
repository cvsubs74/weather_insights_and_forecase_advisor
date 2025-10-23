#!/bin/bash
# Script to build and deploy the new agent-focused React frontend to Firebase Hosting.

# Exit on error
set -e

# --- Configuration ---
FRONTEND_DIR="frontend"
FIREBASE_CONFIG="firebase.agents.json"
FIREBASE_SITE_NAME="weather-insights-advisor"

# --- Main Execution ---

echo "======================================================"
echo "Deploying Agent Frontend to Firebase"
echo "======================================================"

# 1. Navigate to the frontend directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: Frontend directory '$FRONTEND_DIR' not found." >&2
    exit 1
fi
cd "$FRONTEND_DIR"

# 2. Check for dependencies
if [ ! -d "node_modules" ]; then
    echo "Node modules not found. Installing dependencies..."
    npm install
fi

# 3. Check for .env.production file
if [ ! -f ".env.production" ]; then
    echo "Warning: .env.production file not found." >&2
    echo "The agent backend URLs may not be configured." >&2
    echo "Please run ./deploy_agents.sh first to generate this file." >&2
fi

# 4. Build the React application
echo "Building React application for production..."
npm run build

# 5. Navigate back to the root directory
cd ..

# 6. Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing globally..."
    npm install -g firebase-tools
fi

# 7. Deploy to Firebase Hosting using the new config
echo "Deploying to Firebase site: $FIREBASE_SITE_NAME..."
firebase deploy --only hosting --config "$FIREBASE_CONFIG"

# 8. Final output
SITE_URL="https://$FIREBASE_SITE_NAME.web.app"
echo ""
echo "======================================================"
echo "✅ Frontend deployment complete!"
echo "Your application is available at: $SITE_URL"
echo "======================================================"
