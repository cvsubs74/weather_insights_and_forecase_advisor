import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from typing import List, Optional, Dict
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from .tools.tools import geocode_address, search_nearby_places, get_directions
from .tools.logging_utils import log_agent_entry, log_agent_exit

class Coordinates(BaseModel):
    """Geographic coordinates"""
    lat: float = Field(description="Latitude")
    lng: float = Field(description="Longitude")

class Facility(BaseModel):
    """Emergency facility details"""
    name: str = Field(description="Facility name")
    address: str = Field(description="Full address")
    distance: float = Field(description="Distance in miles")
    phone: Optional[str] = Field(description="Phone number")
    coordinates: Coordinates = Field(description="Geographic coordinates")

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
    pharmacies: List[Facility] = Field(description="List of nearby pharmacies")
    evacuation_routes: List[EvacuationRoute] = Field(description="Recommended evacuation routes")
    insights: str = Field(description="Summary and safety recommendations")

# Phase 1: Location Parser
location_parser = LlmAgent(
    model="gemini-2.5-flash-lite",
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
    model="gemini-2.5-flash-lite",
    name="resource_finder",
    description="Finds emergency resources (shelters, hospitals, pharmacies) near a location based on user-specified type and radius.",
    instruction="""
    You are a dynamic emergency resource locator.

    **CONTEXT:**
    The user has provided a `location`, a `resourceType` (e.g., 'shelters', 'hospitals', 'pharmacies'), and a `radius`.
    The previous agent has geocoded the location and stored it in `state['location_data']`.

    **YOUR TASK:**
    1.  Identify the `resourceType` and `radius` from the initial user input, which are available in the `state`.
    2.  Map the `resourceType` to the correct `place_type` for the tool:
        - 'shelters' -> 'emergency shelter'
        - 'hospitals' -> 'hospital'
        - 'pharmacies' -> 'pharmacy'
    3.  Call the `search_nearby_places` tool using the coordinates from `state['location_data']`, the user's `radius`, and the correct `place_type`.
    4.  Store the results for the next agent.
    """,
    tools=[search_nearby_places],
    output_key="facilities",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 3: Route Calculator
route_calculator = LlmAgent(
    model="gemini-2.5-flash-lite",
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

# Phase 4: Final Synthesizer
final_synthesizer = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="final_synthesizer",
    description="Synthesizes all collected data into the final structured output.",
    instruction="""
    You are the final assembly agent. Your only job is to take the data collected by the previous agents and structure it into the final `EmergencyResourcesSummary` JSON object.

    **CONTEXT:**
    - The `state['facilities']` key contains a list of found facilities (shelters, hospitals, or pharmacies).
    - The `state['routes']` key contains a list of calculated evacuation routes.
    - The `state['input']['resourceType']` contains the type of resource the user searched for.

    **YOUR TASK:**
    1.  Create the `EmergencyResourcesSummary` object.
    2.  Populate the correct facility list (`shelters`, `hospitals`, or `pharmacies`) using the data from `state['facilities']`.
    3.  Populate the `evacuation_routes` list using the data from `state['routes']`.
    4.  Generate a brief, helpful summary for the `insights` field based on what was found.

    **CRITICAL:** Output ONLY the final, valid `EmergencyResourcesSummary` JSON object.
    """,
    output_schema=EmergencyResourcesSummary,
    output_key="final_summary",
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
        final_synthesizer,
    ],
)

# ADK export pattern
root_agent = emergency_resources_workflow
