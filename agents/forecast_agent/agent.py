from typing import List, Dict
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from .tools.tools import geocode_address, get_nws_forecast
from .tools.logging_utils import log_agent_entry, log_agent_exit

class DailyForecast(BaseModel):
    """Individual day forecast"""
    date: str = Field(description="Date in YYYY-MM-DD format")
    day: str = Field(description="Day of the week")
    high_temp: int = Field(description="High temperature in Fahrenheit")
    low_temp: int = Field(description="Low temperature in Fahrenheit")
    conditions: str = Field(description="Main weather conditions (e.g., Sunny, Partly Cloudy)")
    precipitation_chance: int = Field(description="Chance of precipitation as a percentage")

class ForecastSummary(BaseModel):
    """Structured output for weather forecast analysis"""
    location: str = Field(description="The city and state of the forecast (e.g., San Francisco, CA)")
    coordinates: Dict[str, float] = Field(description="Latitude and longitude of the location")
    current_conditions: str = Field(description="Current weather conditions")
    daily_forecasts: List[DailyForecast] = Field(description="List of daily forecast details for the next 7 days")
    insights: str = Field(description="Summary of the forecast and any planning advice or notable weather patterns")

# Phase 1: Geocoding Agent
geocoder = LlmAgent(
    name="geocoder",
    model="gemini-2.5-flash-lite",
    description="Geocodes a location name into latitude and longitude coordinates",
    instruction="""
    You are a geocoding specialist. Your task is to convert a location name (e.g., "San Francisco, CA") into geographic coordinates.
    
    **CRITICAL**: You MUST use the `geocode_address` tool to get the coordinates.
    
    Store the result in your response. The next agent needs it.
    """,
    tools=[geocode_address],
    output_key="geocode_result",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Phase 2: Forecast Retrieval Agent
retriever = LlmAgent(
    name="forecast_retriever",
    model="gemini-2.5-flash-lite",
    description="Retrieves 7-day weather forecast using coordinates from the previous step",
    instruction="""
    You are a weather data retrieval specialist. Your task is to get the 7-day forecast for the coordinates provided in the state.
    
    **CRITICAL**: You MUST use the coordinates from `state['geocode_result']` to call the `get_nws_forecast` tool.
    
    Store the forecast data in your response for the next agent.
    """,
    tools=[get_nws_forecast],
    output_key="forecast_data",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

formatter = LlmAgent(
    name="forecast_formatter",
    model="gemini-2.5-flash-lite",
    description="Formats raw forecast data into a structured summary",
    instruction="""
    You are a weather forecaster. Your task is to synthesize the geocode and forecast data into a human-readable summary.
    
    **Process:**
    1. Get the location name from `state['geocode_result']`.
    2. Get the forecast periods from `state['forecast_data']`.
    3. Format the data into a clear, concise weather report.
    4. Include a 7-day outlook and planning insights.
    
    **CRITICAL**: Return a structured JSON response matching the `ForecastSummary` schema.
    """,
    output_schema=ForecastSummary,
    output_key="final_response",
    before_model_callback=log_agent_entry,
    after_model_callback=log_agent_exit,
)

# Sequential Pipeline: Geocoding -> Retrieval -> Formatting
forecast_workflow = SequentialAgent(
    name="forecast_pipeline",
    description="Geocodes location, retrieves weather forecast, and generates structured analysis with planning insights",
    sub_agents=[
        geocoder,
        retriever,
        formatter,
    ],
)

# ADK export pattern
root_agent = forecast_workflow
