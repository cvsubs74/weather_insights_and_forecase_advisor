import os
import json
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.bigquery import BigQueryCredentialsConfig, BigQueryToolset
import google.auth
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize BigQuery Toolset for accessing public datasets
application_default_credentials, project_id = google.auth.default()
if not project_id:
    project_id = os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")

credentials_config = BigQueryCredentialsConfig(
    credentials=application_default_credentials
)
bigquery_toolset = BigQueryToolset(
    credentials_config=credentials_config,
    default_project_id=project_id
)

# NWS API Configuration
NWS_API_BASE = "https://api.weather.gov"
NWS_USER_AGENT = os.getenv("NWS_USER_AGENT", "(WeatherAdvisor, contact@example.com)")
NWS_HEADERS = {
    "User-Agent": NWS_USER_AGENT,
    "Accept": "application/geo+json"
}


def get_nws_forecast(
    tool_context: ToolContext,
    latitude: float,
    longitude: float,
    period: str = "7day"
) -> Dict[str, Any]:
    """Get weather forecast from NWS API for a specific location.
    
    Args:
        latitude (float): Latitude of location
        longitude (float): Longitude of location
        period (str): Forecast period - "7day" or "hourly"
        
    Returns:
        dict: Forecast data with periods, temperatures, and conditions
    """
    try:
        # Step 1: Get grid points for the location
        points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
        points_response = requests.get(points_url, headers=NWS_HEADERS, timeout=10)
        points_response.raise_for_status()
        points_data = points_response.json()
        
        # Extract forecast URL
        if period == "hourly":
            forecast_url = points_data["properties"]["forecastHourly"]
        else:
            forecast_url = points_data["properties"]["forecast"]
        
        # Step 2: Get forecast data
        forecast_response = requests.get(forecast_url, headers=NWS_HEADERS, timeout=10)
        forecast_response.raise_for_status()
        forecast_data = forecast_response.json()
        
        # Extract and format forecast periods
        periods = []
        for period_data in forecast_data["properties"]["periods"]:
            periods.append({
                "name": period_data.get("name"),
                "temperature": period_data.get("temperature"),
                "temperature_unit": period_data.get("temperatureUnit"),
                "wind_speed": period_data.get("windSpeed"),
                "wind_direction": period_data.get("windDirection"),
                "short_forecast": period_data.get("shortForecast"),
                "detailed_forecast": period_data.get("detailedForecast"),
                "precipitation_probability": period_data.get("probabilityOfPrecipitation", {}).get("value")
            })
        
        # Save to state
        tool_context.state["forecast_data"] = {
            "location": f"{latitude},{longitude}",
            "periods": periods,
            "updated": forecast_data["properties"]["updated"],
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Retrieved {len(periods)} forecast periods for {latitude},{longitude}")
        
        return {
            "status": "success",
            "location": f"{latitude},{longitude}",
            "periods": periods,
            "updated": forecast_data["properties"]["updated"]
        }
    
    except Exception as e:
        logger.error(f"Error getting NWS forecast: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get forecast: {str(e)}"
        }


def get_hourly_forecast(
    tool_context: ToolContext,
    latitude: float,
    longitude: float
) -> Dict[str, Any]:
    """Get hourly forecast for next 48 hours from NWS API.
    
    Args:
        latitude (float): Latitude of location
        longitude (float): Longitude of location
        
    Returns:
        dict: Hourly forecast data
    """
    return get_nws_forecast(tool_context, latitude, longitude, period="hourly")


def get_nws_alerts(
    tool_context: ToolContext,
    state: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    severity: Optional[str] = None
) -> Dict[str, Any]:
    """Get active weather alerts from NWS API (real-time).
    
    Args:
        state (str): Two-letter state code (e.g., "FL")
        latitude (float): Latitude for point-based alerts
        longitude (float): Longitude for point-based alerts
        severity (str): Filter by severity - "Extreme", "Severe", "Moderate", "Minor"
        
    Returns:
        dict: Active weather alerts
    """
    try:
        # Build alerts URL
        if latitude and longitude:
            alerts_url = f"{NWS_API_BASE}/alerts/active?point={latitude},{longitude}"
        elif state:
            alerts_url = f"{NWS_API_BASE}/alerts/active?area={state}"
        else:
            alerts_url = f"{NWS_API_BASE}/alerts/active"
        
        # Get alerts
        alerts_response = requests.get(alerts_url, headers=NWS_HEADERS, timeout=10)
        alerts_response.raise_for_status()
        alerts_data = alerts_response.json()
        
        # Extract and format alerts
        alerts = []
        for feature in alerts_data.get("features", []):
            props = feature.get("properties", {})
            
            # Filter by severity if specified
            if severity and props.get("severity") != severity:
                continue
            
            alerts.append({
                "event": props.get("event"),
                "severity": props.get("severity"),
                "urgency": props.get("urgency"),
                "certainty": props.get("certainty"),
                "headline": props.get("headline"),
                "description": props.get("description"),
                "instruction": props.get("instruction"),
                "onset": props.get("onset"),
                "expires": props.get("expires"),
                "affected_zones": props.get("affectedZones", []),
                "sender_name": props.get("senderName")
            })
        
        # Save to state
        tool_context.state["alerts"] = {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Retrieved {len(alerts)} active alerts")
        
        return {
            "status": "success",
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting NWS alerts: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get alerts: {str(e)}"
        }


def get_current_conditions(
    tool_context: ToolContext,
    station_id: str
) -> Dict[str, Any]:
    """Get current weather observations from a NWS station (live data).
    
    Args:
        station_id (str): NWS station ID (e.g., "KMIA" for Miami)
        
    Returns:
        dict: Current weather conditions
    """
    try:
        # Get latest observation
        obs_url = f"{NWS_API_BASE}/stations/{station_id}/observations/latest"
        obs_response = requests.get(obs_url, headers=NWS_HEADERS, timeout=10)
        obs_response.raise_for_status()
        obs_data = obs_response.json()
        
        props = obs_data.get("properties", {})
        
        # Extract current conditions
        conditions = {
            "station_id": station_id,
            "timestamp": props.get("timestamp"),
            "temperature": props.get("temperature", {}).get("value"),
            "temperature_unit": "C",  # NWS returns Celsius
            "dewpoint": props.get("dewpoint", {}).get("value"),
            "humidity": props.get("relativeHumidity", {}).get("value"),
            "wind_speed": props.get("windSpeed", {}).get("value"),
            "wind_direction": props.get("windDirection", {}).get("value"),
            "barometric_pressure": props.get("barometricPressure", {}).get("value"),
            "visibility": props.get("visibility", {}).get("value"),
            "text_description": props.get("textDescription"),
            "raw_message": props.get("rawMessage")
        }
        
        # Save to state
        tool_context.state["current_conditions"] = conditions
        
        logger.info(f"Retrieved current conditions for station {station_id}")
        
        return {
            "status": "success",
            "conditions": conditions
        }
    
    except Exception as e:
        logger.error(f"Error getting current conditions: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get conditions: {str(e)}"
        }


def get_hurricane_track(
    tool_context: ToolContext,
    storm_id: str
) -> Dict[str, Any]:
    """Get live hurricane tracking data from NWS API.
    
    Args:
        storm_id (str): Storm ID (e.g., "AL092024" for Atlantic storm)
        
    Returns:
        dict: Hurricane tracking data including position, intensity, and projected path
    """
    try:
        # Note: NWS API for tropical cyclones uses different endpoints
        # This is a simplified implementation - in production, you'd use:
        # - National Hurricane Center (NHC) data
        # - Tropical cyclone marine forecasts
        
        # Get tropical cyclone products
        products_url = f"{NWS_API_BASE}/products/types/TCM"
        products_response = requests.get(products_url, headers=NWS_HEADERS, timeout=10)
        products_response.raise_for_status()
        products_data = products_response.json()
        
        # This is a simplified response - in production, parse actual hurricane data
        hurricane_data = {
            "storm_id": storm_id,
            "message": "Hurricane tracking requires National Hurricane Center (NHC) data integration",
            "nhc_url": "https://www.nhc.noaa.gov/",
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Hurricane tracking requested for {storm_id}")
        
        return {
            "status": "partial",
            "data": hurricane_data,
            "message": "Full hurricane tracking requires NHC API integration"
        }
    
    except Exception as e:
        logger.error(f"Error getting hurricane track: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get hurricane data: {str(e)}"
        }
