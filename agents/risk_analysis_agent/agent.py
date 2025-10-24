import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import json
import logging
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google.adk.agents import LlmAgent, SequentialAgent
from .tools.logging_utils import log_agent_entry, log_agent_exit
from google.adk.tools import google_search

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RiskAnalysisSummary(BaseModel):
    """Provides a concise, search-grounded risk analysis for a weather alert."""
    alert_summary: str = Field(description="A one-sentence summary of the weather alert.")
    potential_impacts: List[str] = Field(description="A list of potential impacts grounded in search results (e.g., 'Road closures', 'Power outages').")
    safety_recommendations: List[str] = Field(description="Actionable recommendations for the public based on official advice found in search results.")
    supporting_links: List[str] = Field(description="A list of 1-3 highly relevant URLs from the search results, pointing to official sources if possible.")

# --- Agent Definitions ---

# Phase 1: Alert Parser
# This agent ensures the input is clean and structured for the next phases.
# Phase 1: Alert Parser
alert_parser = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="alert_parser",
    description="Parses a single weather alert to extract key information for risk analysis",
    instruction="""
    You are a data extraction specialist.
    Your input is a single weather alert object.

    **Your Task:**
    1.  **Parse the Input**: The user's input is a JSON object or text representing a single weather alert.
    2.  **Extract Key Fields**: From the input, extract the following critical pieces of information:
        *   The type of alert (e.g., "Tornado Warning").
        *   The severity level (e.g., "Severe").
        *   Affected Zones and areas.
        *   The full alert text for context.
    3.  **Store for Next Agent**: Store these extracted fields in a structured way for the `census_data_retriever`.
    """,
    output_key="parsed_alert",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 2: Risk Researcher 
# This agent uses the google_search tool to gather real-time information.
risk_researcher = LlmAgent(
    name="risk_researcher",
    model="gemini-2.5-flash-lite",
    description="Researches the weather alert using Google Search to find real-world impacts and advice.",
    tools=[google_search],
    instruction="""
    You are a professional risk researcher. Your goal is to gather real-time, relevant information about a weather alert using Google Search.
    
    **Your Task:**
    Based on the alert summary provided, perform targeted Google searches to find:
    1.  **Potential Impacts**: What are the potential impacts in affected areas? (e.g., road closures, power outages, infrastructure damage).
    2.  **Safety Recommendations**: What are the official safety recommendations from authorities (like FEMA, NWS, or local government)?

    Perform at least two focused searches to gather this information. The search results will be used to create the final risk analysis.
    """,
    output_key="research_findings",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 3: Risk Synthesizer
# This agent synthesizes the alert data and search findings into a final summary.
risk_synthesizer = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="risk_synthesizer",
    description="Synthesizes alert data and search results into a final risk analysis summary.",
    instruction="""
    You are an expert risk analyst. Your task is to synthesize the provided data into structured output.
    """,
    output_schema=RiskAnalysisSummary,
    output_key="risk_analysis_summary",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# --- Agent Workflow Definition ---

risk_analysis_workflow = SequentialAgent(
    name="search_based_risk_analysis_workflow",
    description="Analyzes weather alert risks using real-time Google Search results.",
    sub_agents=[
        alert_parser,
        risk_researcher,
        risk_synthesizer,
    ],
)

root_agent = risk_analysis_workflow
