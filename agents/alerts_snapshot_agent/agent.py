from typing import List, Dict, Any, Optional
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from .tools.tools import get_nws_alerts, geocode_address, generate_map
from .tools.logging_utils import log_agent_entry, log_agent_exit

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
    map_data: Optional[Dict[str, Any]] = Field(description="Data for generating a map of alert locations")


# Phase 1: Retriever Agent - Fetches alert data
retriever_agent = LlmAgent(
    model="gemini-2.5-flash-lite",
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
    model="gemini-2.5-flash-lite",
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


# Phase 3: Map Generator Agent - Geocodes locations and creates a map
map_generator = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="map_generator",
    description="Generates a map of alert locations",
    instruction="""
    You are a geospatial visualization specialist.

    **Your Task:**
    Generate a map URL based on the locations provided by the previous agent.

    **Input Data from State:**
    -   A list of locations is available in `state['alerts_summary'].locations`.

    **Process:**
    1.  **Geocode Each Location**: For each location in the `state['alerts_summary'].locations` list, call the `geocode_address` tool to get its coordinates. Collect all the resulting coordinates.
    2.  **Generate Map**: Once all locations are geocoded, call the `generate_map` tool. Use the collected coordinates as the `markers`.
        -   Calculate a central latitude and longitude from the markers for `center_lat` and `center_lng`.
        -   Set an appropriate `zoom` level to see all markers.

    The final map data will be automatically saved to `state['map_data']`.
    """,
    tools=[geocode_address, generate_map],
    output_key="map_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 4: Final Synthesizer - Combines all data into the final output
final_synthesizer = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="final_synthesizer",
    description="Combines alert summary and map data into the final output",
    instruction="""
    You are a data assembly specialist. Your task is to combine the structured alert data and the generated map data into a single, final AlertsSummary object.
    """,
    output_schema=AlertsSummary,
    output_key="final_summary",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)


# Sequential Pipeline: Retriever → Formatter → MapGenerator → FinalSynthesizer
alerts_snapshot_workflow = SequentialAgent(
    name="alerts_snapshot_pipeline",
    description="Retrieves weather alerts, generates structured analysis with safety insights, and creates a map.",
    sub_agents=[
        retriever_agent,
        alerts_formatter,
        map_generator,
        final_synthesizer,
    ],
)

# ADK export pattern
# The root agent is the full workflow. The final output will be under the 'final_summary' key.
root_agent = alerts_snapshot_workflow
