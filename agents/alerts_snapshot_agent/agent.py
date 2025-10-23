from typing import List
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import get_nws_alerts
from shared_tools.logging_utils import log_agent_entry, log_agent_exit

class AlertDetail(BaseModel):
    """Individual weather alert details"""
    event: str = Field(description="Alert event type (e.g., Tornado Warning)")
    severity: str = Field(description="Alert severity level")
    headline: str = Field(description="Alert headline")
    description: str = Field(description="Detailed alert description")
    affected_zones: List[str] = Field(description="List of affected zones")
    start_time: str = Field(description="Alert start time")
    end_time: str = Field(description="Alert end time")


class AlertsSummary(BaseModel):
    """Structured output for weather alerts analysis"""
    alerts: List[AlertDetail] = Field(description="List of active weather alerts")
    total_count: int = Field(description="Total number of alerts")
    severe_count: int = Field(description="Number of severe/extreme alerts")
    locations: List[str] = Field(description="List of affected locations")
    insights: str = Field(description="Summary and safety recommendations")


# Phase 1: Retriever Agent - Fetches alert data
retriever_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="alerts_retriever",
    description="Retrieves active weather alerts for specified locations",
    instruction="""
    You are a weather alerts data retrieval specialist.
    
    **Your Task:**
    Retrieve active weather alerts for the requested location.
    
    **Process:**
    1. Parse the location input:
       - If it's a state name (e.g., "California"), convert to 2-letter code ("CA")
       - If it's comma-separated state codes (e.g., "CA,OR,WA"), parse each code
       - If it's "all US states", you'll need to handle nationally
    
    2. Call get_nws_alerts for each state:
       - For single state: get_nws_alerts(state="CA")
       - For multiple states: call get_nws_alerts for each state code
       - DO NOT filter by severity - get ALL alerts
    
    3. Collect all alert data and pass to the formatter
    
    **State Code Mapping:**
    - California → CA
    - Texas → TX
    - Florida → FL
    - New York → NY
    - (Use standard 2-letter postal codes)
    
    Store the collected alert data in your response for the next agent.
    """,
    tools=[get_nws_alerts],
    output_key="alerts_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)


# Phase 2: Formatter Agent - Structures and analyzes alerts
alerts_formatter = LlmAgent(
    model="gemini-2.5-flash",
    name="alerts_formatter",
    description="Formats alert data into structured summary",
    instruction="""
    You are a weather alert presentation specialist.
    
    **Your Task:**
    Format the alert data from state["alerts_data"] into a structured, user-friendly summary.
    
    **Process:**
    1. Extract alerts from state["alerts_data"]
    2. Count total alerts and severe alerts
    3. Identify affected locations
    4. For each alert, extract:
       - Event type (e.g., "Tornado Warning")
       - Severity level
       - Headline
       - Description - Summarize the alert description retaining key information
       - Affected zones
       - Start and end times
    5. Generate insights about the overall alert situation
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the AlertsSummary schema exactly
       - insights: Safety recommendations
    
    **CRITICAL**: Return structured JSON matching AlertsSummary schema exactly.
    """,
    output_schema=AlertsSummary,
    output_key="alerts_summary",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)


# Sequential Pipeline: Retriever → Formatter
alerts_snapshot_workflow = SequentialAgent(
    name="alerts_snapshot_pipeline",
    description="Retrieves weather alerts and generates structured analysis with safety insights",
    sub_agents=[
        retriever_agent,
        alerts_formatter,
    ],
)

# ADK export pattern
root_agent = alerts_snapshot_workflow
