#!/bin/bash
# Script to build and deploy the React frontend to Firebase Hosting

# Exit on error
set -e

# Configuration
BACKEND_URL="https://weather-insights-agent-79797180773.us-central1.run.app"
FRONTEND_DIR="weather-insights-ui"

echo "Firebase Deployment Configuration:"
echo "------------------------"
echo "Backend URL: $BACKEND_URL"
echo "Frontend Directory: $FRONTEND_DIR"
echo "------------------------"

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create production environment file
echo "Creating production environment configuration..."
cat > .env.production << EOF
REACT_APP_API_URL=$BACKEND_URL
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBNwyT3enuqpYe53KD8QLNW8c4Gjngckdw
EOF

# Build the React app
echo "Building React application..."
npm run build

echo ""
echo "Frontend build completed!"
echo "Build output is in: $FRONTEND_DIR/build"
echo ""

# Go back to root directory
cd ..

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Deploy to Firebase Hosting
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "=========================================="
echo "Frontend deployment completed!"
echo "=========================================="
echo ""
echo "Your app is available at:"
echo "https://graph-rag-app-20250811.web.app"
echo "or"
echo "https://graph-rag-app-20250811.firebaseapp.com"
