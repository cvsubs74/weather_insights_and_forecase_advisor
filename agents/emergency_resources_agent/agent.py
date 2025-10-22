from typing import List, Optional, Dict
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import geocode_address, search_nearby_places, get_directions
from shared_tools.logging_utils import log_agent_entry, log_agent_exit

class Facility(BaseModel):
    """Emergency facility details"""
    name: str = Field(description="Facility name")
    address: str = Field(description="Full address")
    distance: float = Field(description="Distance in miles")
    phone: Optional[str] = Field(description="Phone number")

class EvacuationRoute(BaseModel):
    """Evacuation route details"""
    destination: str = Field(description="Destination address")
    distance: str = Field(description="Total distance")
    duration: str = Field(description="Estimated travel time")
    summary: str = Field(description="Route summary (e.g., I-10 E and I-75 S)")

class EmergencyResourcesSummary(BaseModel):
    """Structured output for emergency resources"""
    hospitals: List[Facility] = Field(description="List of nearby hospitals")
    shelters: List[Facility] = Field(description="List of nearby emergency shelters")
    evacuation_routes: List[EvacuationRoute] = Field(description="Recommended evacuation routes")
    insights: str = Field(description="Summary and safety recommendations")

# Phase 1: Location Parser
location_parser = LlmAgent(
    model="gemini-2.5-flash",
    name="location_parser",
    description="Parses location from user query and geocodes it",
    instruction="""
    You are a location specialist.
    
    **Your Task:**
    1. Extract location from user request
    2. Call geocode_address(location) to get coordinates
    3. Store location name and coordinates for resource finder
    
    Pass the location data to the resource finder.
    """,
    tools=[geocode_address],
    output_key="location_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 2: Resource Finder
resource_finder = LlmAgent(
    model="gemini-2.5-flash",
    name="resource_finder",
    description="Finds emergency shelters and hospitals near the location",
    instruction="""
    You are an emergency resource locator.
    
    **Your Task:**
    Find emergency shelters and hospitals near the location provided in `state['location_data']`.
    
    **Process:**
    1. Extract coordinates from state["location_data"]
    2. Call search_nearby_places for shelters:
       - latitude: from state
       - longitude: from state
       - place_type: "emergency shelter"
       - radius: user-specified or 50 (miles)
    3. Call search_nearby_places for hospitals:
       - latitude: from state
       - longitude: from state
       - place_type: "hospital"
       - radius: user-specified or 50 (miles)
    4. Extract facility details (name, address, distance, phone, coordinates)
    5. Sort by distance (closest first)
    6. Store facilities data for formatter
    
    Pass the facilities data to the route calculator.
    """,
    tools=[search_nearby_places],
    output_key="facilities",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 3: Route Calculator
route_calculator = LlmAgent(
    model="gemini-2.5-flash",
    name="route_calculator",
    description="Calculates evacuation routes from the location",
    instruction="""
    You are an evacuation route specialist.
    
    **Your Task:**
    Calculate evacuation routes from the user's location to the nearest safe facilities.
    
    **Process:**
    1. Extract origin location from state["location_data"]["formatted_address"]
    2. Identify safe destinations (use nearest shelters from state["facilities"])
    3. For top 3 nearest shelters, use get_directions tool:
       - origin: from state["location_data"]["formatted_address"]
       - destination: shelter address
       - alternatives: true (to get multiple route options)
    4. Extract route details from each direction:
       - Distance (miles)
       - estimated travel time
       - Route description
       - Key waypoints
    5. Prioritize routes by distance and time
    6. Store route data for formatter
    
    Pass the route data to the resource formatter.
    """,
    tools=[get_directions],
    output_key="routes",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 4: Resource Formatter
resource_formatter = LlmAgent(
    model="gemini-2.5-flash",
    name="resource_formatter",
    description="Formats emergency resources into structured output",
    instruction="""
    You are an emergency resources presentation specialist.
    
    **Your Task:**
    Generate a comprehensive summary of emergency resources with actionable recommendations.
    
    **Process:**
    1. Extract hospitals from state["facilities"]
    2. Extract shelters from state["facilities"]
    3. Extract evacuation routes from state["routes"]
    4. Generate insights and recommendations:
       - Nearest shelter location
       - Hospital availability
       - Best evacuation route
       - Emergency contact information
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the EmergencyResourcesSummary schema exactly
    """,
    output_schema=EmergencyResourcesSummary,
    output_key="resources_summary",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Sequential Pipeline: Location -> Resources -> Routes -> Format
emergency_resources_workflow = SequentialAgent(
    name="emergency_resources_pipeline",
    description="Finds emergency shelters, hospitals, and evacuation routes near a location with distance-sorted recommendations",
    sub_agents=[
        location_parser,
        resource_finder,
        route_calculator,
        resource_formatter,
    ],
)

# ADK export pattern
root_agent = emergency_resources_workflow
