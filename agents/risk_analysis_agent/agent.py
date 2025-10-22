from typing import List
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import (
    get_nws_alerts,
    get_census_demographics,
    get_census_tracts_in_area,
    get_flood_risk_data
)


class RiskAnalysisSummary(BaseModel):
    """Structured output for risk analysis"""
    alert_summary: str = Field(description="Overview of the weather alert")
    population_at_risk: int = Field(description="Estimated population affected")
    risk_score: float = Field(description="Risk score from 0-100")
    risk_level: str = Field(description="Risk level: Low, Medium, High, or Severe")
    vulnerable_areas: List[str] = Field(description="High-risk zones")
    recommendations: List[str] = Field(description="Specific action items")
    evacuation_needed: bool = Field(description="Whether evacuation is recommended")
    insights: str = Field(description="Detailed risk analysis and guidance")


# Phase 1: Alert Retriever
alert_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="alert_retriever",
    description="Retrieves detailed alert information for risk analysis",
    instruction="""
    You are an alert data specialist for risk analysis.
    
    **Your Task:**
    Retrieve the specific alert details for risk assessment.
    
    **Process:**
    1. Parse the location from the user request
    2. Call get_nws_alerts for the location
    3. Extract the specific alert details:
       - Alert type and severity
       - Affected zones
       - Alert description
       - Time window
    4. Store alert data for the next agent
    
    Pass the alert details to the census data retriever.
    """,
    tools=[get_nws_alerts],
    output_key="alert_data",
)


# Phase 2: Census Data Retriever
census_data_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="census_data_retriever",
    description="Retrieves population and flood zone data for affected areas",
    instruction="""
    You are a demographic data specialist.
    
    **Your Task:**
    Retrieve population and flood zone data for the affected areas.
    
    **Process:**
    1. Extract affected zones/locations from state["alert_data"]
    2. For each affected city/county, use get_census_demographics:
       - Extract city and state from alert zones
       - Get population, median age, household data
    3. Use get_census_tracts_in_area to get detailed tract-level data:
       - state: extracted from alert
       - county: extracted from alert (optional)
    4. If flood-related alert, use get_flood_risk_data:
       - state: from alert
       - county: from alert (optional)
    5. Calculate total population at risk by summing all affected areas
    6. Store census data for risk calculation
    
    Pass the census data to the risk calculator.
    """,
    tools=[get_census_demographics, get_census_tracts_in_area, get_flood_risk_data],
    output_key="census_data",
)


# Phase 3: Risk Calculator
risk_calculator = LlmAgent(
    model="gemini-2.5-flash",
    name="risk_calculator",
    description="Calculates risk scores based on alert severity and population data",
    instruction="""
    You are a risk assessment specialist.
    
    **Your Task:**
    Calculate risk scores by combining alert severity with population data.
    
    **Process:**
    1. Extract alert severity from state["alert_data"]
    2. Extract population data from state["census_data"]
    3. Calculate risk score (0-100):
       - Severity weight: 40%
         * Extreme: 100 points
         * Severe: 75 points
         * Moderate: 50 points
         * Minor: 25 points
       - Population weight: 30%
         * >100k: 100 points
         * 50k-100k: 75 points
         * 10k-50k: 50 points
         * <10k: 25 points
       - Flood zone weight: 30%
         * High flood risk: 100 points
         * Moderate: 50 points
         * Low: 25 points
    
    4. Determine risk level:
       - 0-25: Low
       - 26-50: Medium
       - 51-75: High
       - 76-100: Severe
    
    5. Identify vulnerable areas (high population + high severity)
    
    Store risk scores for the recommendation generator.
    """,
    output_key="risk_scores",
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
    1. Extract alert summary from state["alert_summary"]
    2. Extract population data from state["population_data"]
    3. Extract risk assessment from state["risk_assessment"]
    4. Calculate overall risk score (0-100)
    5. Determine risk level (Low/Medium/High/Severe)
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
)


# Sequential Pipeline: Alert → Census → Risk → Recommendations
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

# ADK export pattern
root_agent = risk_analysis_workflow
