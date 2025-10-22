from typing import List
from google.adk.agents import LlmAgent, SequentialAgent
from pydantic import BaseModel, Field
from shared_tools.tools import geocode_address as geocode_location, get_nws_forecast, get_current_conditions


class DailyForecast(BaseModel):
    """Individual day forecast"""
    date: str = Field(description="Date in YYYY-MM-DD format")
    day_name: str = Field(description="Day of week")
    high_temp: int = Field(description="High temperature in Fahrenheit")
    low_temp: int = Field(description="Low temperature in Fahrenheit")
    conditions: str = Field(description="Weather conditions description")
    wind: str = Field(description="Wind information")
    precipitation_chance: int = Field(description="Precipitation chance percentage")


class ForecastSummary(BaseModel):
    """Structured output for weather forecast"""
    location: str = Field(description="Location name")
    coordinates: Dict[str, float] = Field(description="Latitude and longitude")
    current_conditions: str = Field(description="Current weather conditions")
    daily_forecasts: List[DailyForecast] = Field(description="7-day forecast")
    insights: str = Field(description="Planning recommendations based on forecast")


# Phase 1: Geocoding Agent - Converts location to coordinates
geocoding_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="geocoding_agent",
    description="Converts location names to geographic coordinates",
    instruction="""
    You are a geocoding specialist.
    
    **Your Task:**
    Convert the location name to latitude/longitude coordinates.
    
    **Process:**
    1. Parse the location input (city, state, zip code, or address)
    2. Call geocode_location(location) tool
    3. Extract lat and lng from the result
    4. Store in state as: {"lat": latitude, "lng": longitude, "location": location_name}
    
    **Examples:**
    - "San Francisco, CA" → geocode_location("San Francisco, CA")
    - "New York" → geocode_location("New York")
    - "90210" → geocode_location("90210")
    
    Pass the geocoded coordinates to the next agent.
    """,
    tools=[geocode_location],
    output_key="geocode_result",
)


# Phase 2: Forecast Retriever - Fetches weather data
forecast_retriever = LlmAgent(
    model="gemini-2.5-flash",
    name="forecast_retriever",
    description="Retrieves weather forecast and current conditions",
    instruction="""
    You are a weather data retrieval specialist.
    
    **Your Task:**
    Fetch weather forecast and current conditions using coordinates from geocode_result.
    
    **Process:**
    1. Extract coordinates from state["geocode_result"]:
       - lat = state["geocode_result"]["lat"]
       - lng = state["geocode_result"]["lng"]
    
    2. Call get_nws_forecast(lat, lng) to get 7-day forecast
    
    3. Call get_current_conditions(lat, lng) to get current weather
    
    4. Combine both results and pass to formatter
    
    **CRITICAL**: You MUST use the coordinates from geocode_result. Do NOT ask user for coordinates.
    
    Store the forecast data in your response for the next agent.
    """,
    tools=[get_nws_forecast, get_current_conditions],
    output_key="forecast_data",
)


# Phase 3: Forecast Formatter - Structures and analyzes forecast
forecast_formatter = LlmAgent(
    model="gemini-2.5-flash",
    name="forecast_formatter",
    description="Formats forecast data into structured summary",
    instruction="""
    You are a weather forecast presentation specialist.
    
    **Your Task:**
    Format the forecast data into a structured, user-friendly summary.
    
    **Process:**
    1. Extract location from state["location_data"]
    2. Extract current conditions from state["current_conditions"]
    3. Extract forecast periods from state["forecast_data"]
    4. Group forecast into daily summaries (7 days)
    5. For each day, extract:
       - Date (YYYY-MM-DD format)
       - Day name (e.g., "Monday")
       - High/low temperatures
       - Weather conditions
       - Wind information
       - Precipitation chance
    6. Generate insights about the forecast trends
    
    **CRITICAL CONSTRAINTS:**
    - You must return a structured JSON response that matches the ForecastSummary schema exactly
    
    **CRITICAL**: Return structured JSON matching ForecastSummary schema exactly.
    """,
    output_schema=ForecastSummary,
    output_key="forecast_summary",
)


# Sequential Pipeline: Geocoding → Retrieval → Formatting
forecast_workflow = SequentialAgent(
    name="forecast_pipeline",
    description="Geocodes location, retrieves weather forecast, and generates structured analysis with planning insights",
    sub_agents=[
        geocoding_agent,
        forecast_retriever,
        forecast_formatter,
    ],
)

# ADK export pattern
root_agent = forecast_workflow
