import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import logging
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from google.genai import types
from .tools.tools import (
    get_flood_risk_data,
    calculate_evacuation_priority
)
from .tools.logging_utils import log_agent_entry, log_agent_exit

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

class HurricaneData(BaseModel):
    """Structured data extracted from a hurricane image."""
    category: int = Field(description="Hurricane category (1-5)")
    states: List[str] = Field(description="List of affected state codes (e.g., [\"FL\", \"GA\"])")
    min_lat: float = Field(description="Minimum latitude of the bounding box")
    max_lat: float = Field(description="Maximum latitude of the bounding box")
    min_lng: float = Field(description="Minimum longitude of the bounding box")
    max_lng: float = Field(description="Maximum longitude of the bounding box")

class EvacuationPriority(BaseModel):
    """Details of a single prioritized high-risk location."""
    latitude: float = Field(description="Latitude of the high-risk location")
    longitude: float = Field(description="Longitude of the high-risk location")
    risk_score: float = Field(description="Calculated evacuation risk score")
    details: Dict[str, Any] = Field(description="Details contributing to the risk score")

class EvacuationPlan(BaseModel):
    """The complete, prioritized evacuation plan based on flood risk."""
    prioritized_locations: List[EvacuationPriority] = Field(description="A list of geographic locations prioritized for evacuation.")
    affected_states: List[str] = Field(description="List of states affected by the hurricane")
    hurricane_category: int = Field(description="Hurricane category (1-5)")
    total_high_risk_locations: int = Field(description="Total number of high-risk locations identified")
    highest_risk_score: float = Field(description="The highest risk score among all locations")
    insights: Dict[str, Any] = Field(description="Additional insights and analysis about the evacuation priorities")


# Hurricane Image Analysis Agent
hurricane_image_analysis_agent = LlmAgent(
    name="hurricane_image_analysis_agent",
    model="gemini-2.5-flash",
    description="Analyzes hurricane images to extract key data.",
    instruction="""
    Analyze the provided hurricane image to extract its category, affected states, and geographic bounding box.
    
    **Your Task:**
    1.  Determine the hurricane's category (1-5).
    2.  List the affected states (e.g., "FL,GA,SC").
    3.  Define the geographic bounding box (min/max latitude and longitude).
    4.  Save this data to the state object for the next agent.
    """,
    output_schema=HurricaneData,
    output_key="hurricane_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit
)

# Evacuation Coordinator Agent (Simplified for this workflow)
evacuation_coordinator_agent = LlmAgent(
    name="evacuation_coordinator_agent",
    model="gemini-2.5-flash",
    description="Orchestrates hurricane evacuation priority analysis.",
    instruction="""Coordinate evacuation priority analysis using hurricane and flood risk data.

Your Workflow:
1. Use the hurricane_data from the state to call get_flood_risk_data for each affected state.
2. Once the flood data is available, call calculate_evacuation_priority with the hurricane intensity.
3. CRITICAL: Synthesize the tool responses into the EvacuationPlan output schema format.

Output Schema Requirements:
You MUST return data in this exact format:
- prioritized_locations: MUST be a LIST extracted from calculate_evacuation_priority tool data.prioritized_locations
- affected_states: Get from hurricane_data in state as a list
- hurricane_category: Get from hurricane_data in state as integer
- total_high_risk_locations: Count of prioritized_locations as integer
- highest_risk_score: Maximum risk_score from prioritized_locations as float
- insights: Your analysis and recommendations as a structured object as dict

CRITICAL: prioritized_locations MUST be a list, even if there is only one location.
Do NOT return raw tool responses. Transform the tool data into the final schema.

The insights should include geographic_distribution, risk_patterns, evacuation_recommendations, and resource_allocation as string fields.""",
    tools=[
        get_flood_risk_data,
        calculate_evacuation_priority
    ],
    output_schema=EvacuationPlan,
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit
)

# Hurricane Simulation Sequential Agent
HurricaneSimulationAgent = SequentialAgent(
    name="HurricaneSimulationAgent",
    description="A sequential agent that analyzes a hurricane image and then coordinates an evacuation plan.",
    sub_agents=[
        hurricane_image_analysis_agent,
        evacuation_coordinator_agent
    ],
)

root_agent = HurricaneSimulationAgent
