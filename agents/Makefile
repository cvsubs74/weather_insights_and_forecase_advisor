# Weather Insights Multi-Agent System Makefile

alerts-snapshot:
	uv run adk api_server alerts_snapshot_agent --allow_origins="*" --port=8081

alerts-snapshot-dev:
	uv run adk web alerts_snapshot_agent

forecast-agent:
	uv run adk api_server forecast_agent --allow_origins="*" --port=8082

forecast-agent-dev:
	uv run adk web forecast_agent

risk-analysis:
	uv run adk api_server risk_analysis_agent --allow_origins="*" --port=8083

risk-analysis-dev:
	uv run adk web risk_analysis_agent

emergency-resources:
	uv run adk api_server emergency_resources_agent --allow_origins="*" --port=8084

emergency-resources-dev:
	uv run adk web emergency_resources_agent

chat-agent:
	uv run adk api_server chat --allow_origins="*" --port=8090

chat-agent-dev:
	uv run adk web chat

agents:
	make alerts-snapshot & make forecast-agent & make risk-analysis & make emergency-resources & make chat-agent
