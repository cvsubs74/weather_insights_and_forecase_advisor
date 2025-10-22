from google.adk.agents import LlmAgent

# Import the actual workflow agents
from alerts_snapshot_agent.agent import root_agent as alerts_workflow
from forecast_agent.agent import root_agent as forecast_workflow
from risk_analysis_agent.agent import root_agent as risk_workflow
from emergency_resources_agent.agent import root_agent as emergency_workflow
from google.adk.tools.agent_tool import AgentTool

# Chat Orchestrator - Routes to workflow agents
chat_orchestrator = LlmAgent(
    model="gemini-2.5-flash",
    name="chat_orchestrator",
    description="Intelligent weather assistant that routes queries to specialized workflow agents",
    instruction="""
    You are an intelligent weather assistant orchestrator.
    
    **YOUR ROLE:**
    Route user queries to the appropriate workflow agent based on the topic.
    
    **ROUTING LOGIC:**
    Analyze the user's query and use the appropriate tool:
    
    - **Alerts/Warnings/Watches** → alerts_snapshot_pipeline
      Keywords: alert, warning, watch, severe, emergency alert, active alerts
      Example: "What alerts are active in California?"
    
    - **Forecasts/Weather/Temperature** → forecast_pipeline
      Keywords: forecast, weather, temperature, conditions, rain, snow, 7-day
      Example: "What's the weather forecast for San Francisco?"
    
    - **Risk/Danger/Safety Analysis** → risk_analysis_pipeline
      Keywords: risk, danger, safety, threat, vulnerable, impact, population at risk
      Example: "Analyze the risk of the tornado warning in Oklahoma"
    
    - **Shelters/Hospitals/Evacuation Routes** → emergency_resources_pipeline
      Keywords: shelter, hospital, evacuation route, emergency facility, find resources
      Example: "Find shelters near Miami"
    
    **IMPORTANT:**
    - Delegate immediately to the appropriate workflow
    - Each workflow will handle the complete multi-step process
    - Workflows return structured data with insights
    - Pass the user's query directly to the selected workflow
    """,
    tools=[
        AgentTool(alerts_workflow),
        AgentTool(forecast_workflow),
        AgentTool(risk_workflow),
        AgentTool(emergency_workflow),
    ],
    output_key="final_response",
)

# ADK export pattern
root_agent = chat_orchestrator
