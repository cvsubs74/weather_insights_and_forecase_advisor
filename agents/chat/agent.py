from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool
# Import the actual workflow agents
from .sub_agents.alerts_snapshot_agent.agent import alerts_snapshot_workflow
from .sub_agents.forecast_agent.agent import forecast_workflow
from .sub_agents.risk_analysis_agent.agent import risk_analysis_workflow
from .sub_agents.emergency_resources_agent.agent import emergency_resources_workflow
from .sub_agents.hurricane_simulation_agent.agent import hurricane_analysis_workflow

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Callback functions for agent lifecycle logging
def log_agent_entry(callback_context, llm_request):
    """Logs when an agent is about to be executed."""
    logger.info("="*80)
    logger.info(f"🔄 AGENT ENTRY / TRANSFER: {callback_context.agent_name}")
    logger.info("="*80)

def log_agent_exit(callback_context, llm_response):
    """Logs when an agent has finished execution."""
    logger.info("="*80)
    logger.info(f"✅ AGENT EXIT: {callback_context.agent_name}")
    # Optionally log the type of response (e.g., function call)
    if llm_response.content and llm_response.content.parts:
        for part in llm_response.content.parts:
            if part.function_call:
                logger.info(f"   ↪️ Suggested Action: Call tool '{part.function_call.name}'")
    logger.info("="*80)

# Chat Orchestrator - Routes to workflow agents
chat_orchestrator = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="chat_orchestrator",
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
    
    - **Hurricane Analysis/Image Processing** → hurricane_simulation_pipeline
      Keywords: hurricane, image, analyze, satellite, storm, evacuation priority, hurricane category
      Example: "Analyze this hurricane satellite image" or "What's the evacuation priority for this storm?"
    
    **IMPORTANT:**
    - Delegate immediately to the appropriate workflow
    - Each workflow will handle the complete multi-step process
    - Workflows return structured data with insights
    - Pass the user's query directly to the selected workflow
    """,
    tools=[
        AgentTool(alerts_snapshot_workflow),
        AgentTool(forecast_workflow),
        AgentTool(risk_analysis_workflow),
        AgentTool(emergency_resources_workflow),
        AgentTool(hurricane_analysis_workflow),
    ],
    output_key="final_response",
)

# ADK export pattern
root_agent = chat_orchestrator
