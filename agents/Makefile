# Weather Insights Multi-Agent System Makefile

# Set PYTHONPATH to the current directory so ADK can find the agent modules


alerts-snapshot:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server alerts_snapshot_agent --allow_origins="*" --port=8081 --log_level=debug >> alerts_snapshot_agent.log 2>&1

alerts-snapshot-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web alerts_snapshot_agent

forecast-agent:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server forecast_agent --allow_origins="*" --port=8082 --log_level=debug >> forecast_agent.log 2>&1

forecast-agent-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web forecast_agent

risk-analysis:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server risk_analysis_agent --allow_origins="*" --port=8083 --log_level=debug >> risk_analysis_agent.log 2>&1

risk-analysis-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web risk_analysis_agent

emergency-resources:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server emergency_resources_agent --allow_origins="*" --port=8084 --log_level=debug >> emergency_resources_agent.log 2>&1

emergency-resources-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web emergency_resources_agent

risk-analysis-v1:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server risk_analysis_agent_v1 --allow_origins="*" --port=8085 --log_level=debug >> risk_analysis_agent_v1.log 2>&1

risk-analysis-v1-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web risk_analysis_agent_v1

chat-agent:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server chat --allow_origins="*" --port=8090 --log_level=debug >> chat_agent.log 2>&1

chat-agent-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web chat

log-analyzer:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server log_analyzer_agent --allow_origins="*" --port=8091 >> log_analyzer_agent.log 2>&1

log-analyzer-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web log_analyzer_agent

hurricane-simulation:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server hurricane_simulation_agent --allow_origins="*" --port=8085 --log_level=debug >> hurricane_simulation_agent.log 2>&1

hurricane-simulation-dev:
	PYTHONPATH=$(shell pwd) ../.venv/bin/adk web hurricane_simulation_agent

agents:
	@echo "Starting all agents in the background..."
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server alerts_snapshot_agent --allow_origins="*" --port=8081 --log_level=debug >> alerts_snapshot_agent.log 2>&1 &
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server forecast_agent --allow_origins="*" --port=8082 --log_level=debug >> forecast_agent.log 2>&1 &
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server risk_analysis_agent --allow_origins="*" --port=8083 --log_level=debug >> risk_analysis_agent.log 2>&1 &
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server emergency_resources_agent --allow_origins="*" --port=8084 --log_level=debug >> emergency_resources_agent.log 2>&1 &
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server hurricane_simulation_agent --allow_origins="*" --port=8085 --log_level=debug >> hurricane_simulation_agent.log 2>&1 &
	@PYTHONPATH=$(shell pwd) ../.venv/bin/adk api_server chat --allow_origins="*" --port=8090 --log_level=debug >> chat_agent.log 2>&1 &
	@echo "All agents are starting. Check the .log files for output."

.PHONY: clean-logs
clean-logs:
	rm -f *.log
