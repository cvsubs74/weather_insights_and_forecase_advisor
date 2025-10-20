# Makefile for Weather Insights and Forecast Advisor

.PHONY: help install run-agent run-ui deploy-backend deploy-frontend deploy-all clean

help:
	@echo "Weather Insights and Forecast Advisor - Available Commands"
	@echo "=========================================================="
	@echo "Development:"
	@echo "  make install          - Install dependencies"
	@echo "  make run-agent        - Run agent backend locally (port 8000)"
	@echo "  make run-ui           - Run React frontend locally (port 3000)"
	@echo "  make run-all          - Run both backend and frontend"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-backend   - Deploy backend agent to Cloud Run"
	@echo "  make deploy-frontend  - Build and prepare frontend for deployment"
	@echo "  make deploy-all       - Deploy both backend and frontend"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Clean build artifacts"

install:
	@echo "Installing backend dependencies..."
	pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd weather-insights-ui && npm install

run-agent:
	@echo "Starting Weather Insights Agent backend on port 8000..."
	uv run adk api_server weather_insights_agent --allow_origins="*" --port=8000

run-agent-dev:
	@echo "Starting Weather Insights Agent with ADK web UI..."
	uv run adk web weather_insights_agent

run-ui:
	@echo "Starting React frontend on port 3000..."
	cd weather-insights-ui && npm start

run-all:
	@echo "Starting both backend and frontend..."
	make run-agent & make run-ui

deploy-backend:
	@echo "Deploying backend agent to Cloud Run..."
	chmod +x deploy_backend.sh
	./deploy_backend.sh

deploy-frontend:
	@echo "Building frontend for deployment..."
	chmod +x deploy_frontend.sh
	./deploy_frontend.sh

deploy-all:
	@echo "Deploying backend and frontend..."
	make deploy-backend
	make deploy-frontend

clean:
	@echo "Cleaning build artifacts..."
	rm -rf weather-insights-ui/build
	rm -rf weather-insights-ui/node_modules
	rm -rf __pycache__
	rm -rf weather_insights_agent/__pycache__
	rm -rf weather_insights_agent/weather_tools/__pycache__
	find . -type d -name "*.egg-info" -exec rm -rf {} +
