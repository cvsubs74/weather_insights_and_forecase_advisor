from typing import List
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import get_census_tracts_in_area, get_flood_risk_data, get_nws_alerts, get_census_demographics, geocode_address
from shared_tools.logging_utils import log_agent_entry, log_agent_exit

class RiskAnalysisSummary(BaseModel):
    """Structured output for risk analysis"""
    alert_summary: str = Field(description="Overview of the weather alert")
    population_at_risk: int = Field(description="Estimated population affected")
    risk_score: int = Field(description="Overall risk score (0-100)")
    risk_level: str = Field(description="Risk level (Low, Medium, High, Severe)")
    vulnerable_areas: List[str] = Field(description="List of areas with high population and risk")
    recommendations: List[str] = Field(description="Actionable recommendations for emergency managers")
    evacuation_needed: bool = Field(description="Whether evacuation is recommended")

# Phase 1: Alert Parser
alert_parser = LlmAgent(
    model="gemini-2.5-flash",
    name="alert_parser",
    description="Parses a single weather alert to extract key information for risk analysis",
    instruction="""
    You are a data extraction specialist.
    Your input is a single weather alert object.

    **Your Task:**
    1.  **Parse the Input**: The user's input is a JSON object or text representing a single weather alert.
    2.  **Extract Key Fields**: From the input, extract the following critical pieces of information:
        *   `event`: The type of alert (e.g., "Tornado Warning").
        *   `severity`: The severity level (e.g., "Severe").
        *   `affected_zones`: A list of URLs pointing to the affected areas.
        *   `areaDesc`: A string describing the affected areas (e.g., "San Diego County").
        *   The full alert text for context.
    3.  **Store for Next Agent**: Store these extracted fields in a structured way for the `census_data_retriever`.
    """,
    output_key="parsed_alert_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 2: Census Data Retriever
census_data_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="census_data_retriever",
    description="Retrieves population and flood zone data for affected areas",
    instruction="""
    You are a demographic and geographic data specialist.

    **Your Task:**
    1.  **Get Parsed Data**: Access the structured data from `state['parsed_alert_data']`.
    2.  **Extract County Codes**: From the `affected_zones` list, extract the county FIPS code from each URL (e.g., extract `CAC073` from `https://api.weather.gov/zones/county/CAC073`).
    3.  **Get Demographics**: Use the extracted county codes with the `get_census_demographics` tool to get population data.
    4.  **Get Flood Risk**: If the alert `event` from the parsed data is flood-related, use the `get_flood_risk_data` tool.
    5.  **Calculate Total Population**: Sum the populations from all affected census tracts to get a total `population_at_risk`.
    6.  **Store Data**: Store the combined census and flood risk data for the next agent.

    **Fallback**: If you cannot extract a specific county code, use the `geocode_address` tool on the `areaDesc` string from the parsed data to find the location.

    Pass the aggregated census and risk data to the risk calculator.
    """,
    tools=[get_census_demographics, get_census_tracts_in_area, get_flood_risk_data, geocode_address],
    output_key="census_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 3: Risk Calculator
risk_calculator = LlmAgent(
    model="gemini-2.5-flash",
    name="risk_calculator",
    description="Calculates risk scores based on alert severity and population data",
    instruction="""
    You are a risk assessment specialist.
    
    **Your Task:**
    1. Get alert severity from `state['alert_data']`.
    2. Get population data from `state['census_data']`.
    3. Get flood risk if available from `state['census_data']`.
    4. Calculate a risk score (0-100) based on:
       - Severity (Minor=10, Moderate=40, Severe=70, Extreme=90)
       - Population density (higher density = higher score)
       - Flood risk (if present, adds to score)
       - Assign a risk level based on the score:
       - 0-25: Low
       - 26-50: Medium
       - 51-75: High
       - 76-100: Severe
    
    5. Identify vulnerable areas (high population + high severity)
    
    Store risk scores for the recommendation generator.
    """,
    output_key="risk_scores",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 4: Risk Recommendations Generator
recommendations_generator = LlmAgent(
    model="gemini-2.5-flash",
    name="recommendations_generator",
    description="Generates risk analysis summary with recommendations",
    instruction="""
    You are an emergency management specialist.
    
    **Your Task:**
    Generate a comprehensive risk analysis summary with actionable recommendations.
    
    **Process:**
    1. Extract alert summary from state["alert_data"]
    2. Extract population data from state["census_data"]
    3. Extract risk assessment from state["risk_scores"]
    4. Calculate overall risk score (0-100)
    5. Determine risk level (low/Medium/High/Severe)
    6. Identify vulnerable areas
    7. Generate specific recommendations:
       - Immediate actions
       - Preparation steps
       - Evacuation guidance if needed
    8. Determine if evacuation is needed
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the RiskAnalysisSummary schema exactly
    
    **CRITICAL**: Return structured JSON matching RiskAnalysisSummary schema exactly.
    """,
    output_schema=RiskAnalysisSummary,
    output_key="risk_analysis_summary",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)


# Sequential Pipeline: Alert -> Census -> Risk -> Recommendations
risk_analysis_workflow = SequentialAgent(
    name="risk_analysis_pipeline",
    description="Analyzes weather alert risks by combining alert severity, population data, and flood zones to generate actionable safety recommendations",
    sub_agents=[
        alert_parser,
        census_data_retriever,
        risk_calculator,
        recommendations_generator,
    ],
)
root_agent = risk_analysis_workflow
