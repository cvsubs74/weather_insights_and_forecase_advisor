from typing import List
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import get_census_tracts_in_area, get_flood_risk_data, get_nws_alerts, get_census_demographics
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

# Phase 1: Alert Retriever
alert_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="alert_retriever",
    description="Retrieves active weather alerts for a specified location",
    instruction="""
    You are a weather alert data specialist.
    
    **Your Task:**
    1. Get the active weather alert for the user-provided location.
    2. Use the `get_nws_alerts` tool.
    3. Extract key details:
       - Alert type and severity
       - Affected zones
       - Alert description
       - Time window
    4. Store alert data for the next agent
    
    Pass the alert details to the census data retriever.
    """,
    tools=[get_nws_alerts],
    output_key="alert_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 2: Census Data Retriever
census_data_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="census_data_retriever",
    description="Retrieves population and flood zone data for affected areas",
    instruction="""
    You are a demographic data specialist.
    
    **Your Task:**
    1. Get the affected areas from `state['alert_data']`.
    2. For each area, use `get_census_demographics` to get population data.
    3. Use `get_census_tracts_in_area` to identify specific census tracts.
    4. If flood-related alert, use `get_flood_risk_data`:
       - state: from alert
       - county: from alert (optional)
    5. Calculate total population at risk by summing all affected areas
    6. Store census data for risk calculation
    
    Pass the census data to the risk calculator.
    """,
    tools=[get_census_demographics, get_census_tracts_in_area, get_flood_risk_data],
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
        alert_retriever,
        census_data_retriever,
        risk_calculator,
        recommendations_generator,
    ],
)
root_agent = risk_analysis_workflow
