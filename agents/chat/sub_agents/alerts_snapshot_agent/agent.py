import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from typing import List, Dict, Any, Optional
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from ...tools.tools import get_nws_alerts, geocode_address, generate_map, get_zone_coordinates
from ...tools.logging_utils import log_agent_entry, log_agent_exit

class AlertDetail(BaseModel):
    """Individual weather alert details"""
    event: str = Field(description="Alert event type (e.g., Tornado Warning)")
    severity: str = Field(description="Alert severity level")
    headline: str = Field(description="Alert headline")
    description: str = Field(description="Full detailed alert description")
    description_short: str = Field(description="Shortened description for card display (max 150 chars)")
    affected_zones: List[str] = Field(description="List of affected zones")
    start_time: str = Field(description="Alert start time")
    end_time: str = Field(description="Alert end time")


class AlertsFormatterOutput(BaseModel):
    """Intermediate output from alerts formatter (without map data)"""
    alerts: List[AlertDetail] = Field(description="List of active weather alerts")
    total_count: int = Field(description="Total number of alerts")
    severe_count: int = Field(description="Number of severe/extreme alerts")
    locations: List[str] = Field(description="List of affected locations")
    insights: str = Field(description="Summary and safety recommendations")


class AlertsSummary(BaseModel):
    """Final structured output for weather alerts analysis with map data"""
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
    Retrieve active weather alerts for the requested location using the get_nws_alerts tool.
    
    **Tool Usage Guidelines:**
    
    1. **For NATIONAL/ALL alerts** (e.g., "United States", "nationwide", "all states"):
       - Call: get_nws_alerts() with NO parameters
       - This retrieves ALL active alerts across the entire United States
    
    2. **For SPECIFIC STATE** (e.g., "California", "FL", "Texas"):
       - Convert state name to 2-letter code if needed
       - Call: get_nws_alerts(state="CA")
       - Use standard postal codes: California→CA, Texas→TX, Florida→FL, etc.
    
    3. **For SPECIFIC COORDINATES** (if lat/lng provided):
       - Call: get_nws_alerts(latitude=37.7749, longitude=-122.4194)
    
    4. **For MULTIPLE STATES** (e.g., "CA,TX,FL"):
       - Make separate calls for each state
       - Combine results before passing to formatter
    
    **Important:**
    - DO NOT pass state parameter for national queries
    - DO NOT filter by severity - get ALL alerts
    - The tool automatically handles the NWS API endpoints
    
    **Examples:**
    - "Get alerts for United States" → get_nws_alerts()
    - "Get alerts for California" → get_nws_alerts(state="CA")  
    - "Get alerts for Miami coordinates" → get_nws_alerts(latitude=25.7617, longitude=-80.1918)
    
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
       - Description - Full detailed alert description (preserve all important information)
       - Description_short - Concise summary for card display (max 150 characters, focus on key hazards and impacts)
       - Affected zones
       - Start and end times
    5. Generate insights about the overall alert situation
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the AlertsFormatterOutput schema exactly
       - insights: Safety recommendations
    
    **CRITICAL**: Return structured JSON matching AlertsFormatterOutput schema exactly.
    """,
    output_schema=AlertsFormatterOutput,
    output_key="formatted_alerts",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)


# Phase 3: Map Generator - Creates map visualization
map_generator = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="map_generator",
    description="Generates map data for alert locations using zone coordinates",
    instruction="""
    You are a geographic data specialist. Your task is to convert NWS zone IDs into geographic coordinates and generate map data.

    **Input Data from State:**
    -   Alert data with affected_zones is available in `state['formatted_alerts'].alerts`.
    -   Each alert has an `affected_zones` field containing NWS zone IDs (e.g., ['FLZ069', 'FLZ127']).

    **Process:**
    1.  **Collect All Zone IDs**: Extract all unique zone IDs from all alerts in `state['formatted_alerts'].alerts`.
        - Iterate through each alert's `affected_zones` field
        - Collect all unique zone IDs into a single list
        - Remove duplicates
    
    2.  **Get Zone Coordinates**: Call the `get_zone_coordinates` tool with the list of unique zone IDs.
        - This will return geographic coordinates (lat/lng) for each zone
        - The tool fetches zone geometry from NWS API and calculates centroids
    
    3.  **Generate Map**: Once you have the zone coordinates, call the `generate_map` tool.
        - Use the coordinates from step 2 as the `markers`
        - Calculate a central latitude and longitude from all markers for `center_lat` and `center_lng`
        - Set an appropriate `zoom` level to see all markers (typically 5-7 for multi-state, 8-10 for single state)

    **Important:**
    - Use zone IDs, NOT location names for geocoding
    - Zone IDs are like 'FLZ069', 'CAC073', 'TXZ123'
    - The get_zone_coordinates tool handles the NWS API calls
    - If some zones fail to geocode, continue with the ones that succeed

    The final map data will be automatically saved to `state['map_data']`.
    """,
    tools=[get_zone_coordinates, generate_map],
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
    
    **Your Task:**
    Combine data from state into a final AlertsSummary response.
    
    **Input Data:**
    - state['formatted_alerts']: AlertsFormatterOutput containing alerts, total_count, severe_count, locations, insights
    - state['map_data']: Map information with markers array structure from map generator
    
    **CRITICAL Instructions:**
    1. **Copy ALL fields from state['formatted_alerts']:**
       - alerts (complete list)
       - total_count
       - severe_count  
       - locations
       - insights
    
    2. **Add map_data field:**
       - Copy state['map_data'] EXACTLY as-is to the map_data field
       - DO NOT restructure or modify the map_data object
       - The map_data should maintain its original structure with markers array
    
    3. **Output Schema:** Return AlertsSummary with ALL fields populated:
       - alerts, total_count, severe_count, locations, insights (from formatted_alerts)
       - map_data (from map_data state)
    
    **CRITICAL:** Preserve exact map_data structure and include all alert information.
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
