from typing import List, Optional
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import (
    geocode_address as geocode_location,
    search_nearby_places,
    get_directions,
    get_census_demographics,
    get_census_tracts_in_area
)


class Facility(BaseModel):
    """Emergency facility details"""
    name: str = Field(description="Facility name")
    address: str = Field(description="Full address")
    distance: float = Field(description="Distance in miles")
    capacity: int = Field(description="Capacity or beds available")
    phone: str = Field(description="Contact phone number")
    coordinates: Dict[str, float] = Field(description="Lat/lng coordinates")


class Route(BaseModel):
    """Evacuation route details"""
    name: str = Field(description="Route name")
    description: str = Field(description="Route description")
    distance: float = Field(description="Distance in miles")
    estimated_time: str = Field(description="Estimated travel time")
    waypoints: List[Dict[str, float]] = Field(description="Route waypoints")


class EmergencyResourcesSummary(BaseModel):
    """Structured output for emergency resources"""
    location: str = Field(description="Search location")
    shelters: List[Facility] = Field(description="Emergency shelters")
    hospitals: List[Facility] = Field(description="Nearby hospitals")
    evacuation_routes: List[Route] = Field(description="Recommended evacuation routes")
    insights: str = Field(description="Resource recommendations and guidance")


# Phase 1: Location Parser
location_parser = LlmAgent(
    model="gemini-2.5-flash",
    name="location_parser",
    description="Parses and geocodes the search location",
    instruction="""
    You are a location parsing specialist.
    
    **Your Task:**
    Parse the location input and convert to coordinates.
    
    **Process:**
    1. Extract location from user request
    2. Call geocode_location(location) to get coordinates
    3. Store location name and coordinates for resource finder
    
    Pass the location data to the resource finder.
    """,
    tools=[geocode_location],
    output_key="location_data",
)


# Phase 2: Resource Finder
resource_finder = LlmAgent(
    model="gemini-2.5-flash",
    name="resource_finder",
    description="Finds emergency shelters and hospitals near the location",
    instruction="""
    You are an emergency resource locator.
    
    **Your Task:**
    Find shelters and hospitals near the specified location.
    
    **Process:**
    1. Extract location and coordinates from state["location_data"]
    2. Check if user provided a search radius in the original query
       - If radius is specified, use that value
       - Otherwise, default to 50 miles
    3. Use search_nearby_places to find shelters:
       - location: from state["location_data"]["formatted_address"]
       - place_type: "shelter" or "emergency_shelter"
       - radius: user-specified or 50 (miles)
    4. Use search_nearby_places to find hospitals:
       - location: from state["location_data"]["formatted_address"]
       - place_type: "hospital"
       - radius: user-specified or 50 (miles)
    5. Extract facility details (name, address, distance, phone, coordinates)
    6. Sort by distance (closest first)
    7. Store facilities data for formatter
    
    Pass the facilities data to the route calculator.
    """,
    tools=[search_nearby_places],
    output_key="facilities",
)


# Phase 3: Route Calculator
route_calculator = LlmAgent(
    model="gemini-2.5-flash",
    name="route_calculator",
    description="Calculates evacuation routes from the location",
    instruction="""
    You are an evacuation route specialist.
    
    **Your Task:**
    Identify and calculate evacuation routes from the location.
    
    **Process:**
    1. Extract origin location from state["location_data"]["formatted_address"]
    2. Identify safe destinations (use nearest shelters from state["facilities"])
    3. For top 3 nearest shelters, use get_directions tool:
       - origin: from state["location_data"]["formatted_address"]
       - destination: shelter address
       - alternatives: true (to get multiple route options)
    4. Extract route details from each direction:
       - Distance (miles)
       - Estimated travel time
       - Route description
       - Key waypoints
    5. Prioritize routes by distance and time
    6. Store route data for formatter
    
    Pass the route data to the resource formatter.
    """,
    tools=[get_directions],
    output_key="routes",
)


# Phase 4: Resource Formatter
resource_formatter = LlmAgent(
    model="gemini-2.5-flash",
    name="resource_formatter",
    description="Formats emergency resources into structured output",
    instruction="""
    You are an emergency resources presentation specialist.
    
    **Your Task:**
    Format all resource data into a structured, user-friendly output.
    
    **Process:**
    1. Extract location from state["location_data"]
    2. Format shelters from state["facilities"]:
       - Sort by distance
       - Include name, address, capacity, phone, coordinates
    3. Format hospitals from state["facilities"]:
       - Sort by distance
       - Include name, address, beds, phone, coordinates
    4. Format evacuation routes from state["routes"]:
       - Sort by distance/time
       - Include route name, description, distance, time, waypoints
    5. Generate insights and recommendations:
       - Nearest shelter location
       - Hospital availability
       - Best evacuation route
       - Emergency contact information
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the EmergencyResourcesSummary schema exactly
    """,
    output_schema=EmergencyResourcesSummary,
    output_key="resources_summary",
)


# Sequential Pipeline: Location → Resources → Routes → Format
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
