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
    credentials_config=credentials_config
    # ,
    # default_project_id=project_id
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
        
        update_time = forecast_data["properties"].get("updated") or forecast_data["properties"].get("updateTime")
        
        # Save to state
        tool_context.state["forecast_data"] = {
            "location": f"{latitude},{longitude}",
            "periods": periods,
            "updated": update_time,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Retrieved {len(periods)} forecast periods for {latitude},{longitude}")
        
        return {
            "status": "success",
            "location": f"{latitude},{longitude}",
            "periods": periods,
            "updated": update_time
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


# Google Maps API Configuration
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
GOOGLE_MAPS_BASE = "https://maps.googleapis.com/maps/api"


def geocode_address(
    tool_context: ToolContext,
    address: str
) -> Dict[str, Any]:
    """Geocode an address to latitude/longitude coordinates using Google Maps Geocoding API.
    
    Args:
        address (str): Address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
        
    Returns:
        dict: Geocoding results with coordinates and formatted address
    """
    try:
        if not GOOGLE_MAPS_API_KEY:
            return {
                "status": "error",
                "message": "GOOGLE_MAPS_API_KEY not configured"
            }
        
        # Call Google Maps Geocoding API
        geocode_url = f"{GOOGLE_MAPS_BASE}/geocode/json"
        params = {
            "address": address,
            "key": GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(geocode_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] != "OK":
            return {
                "status": "error",
                "message": f"Geocoding failed: {data.get('status')}"
            }
        
        # Extract first result
        result = data["results"][0]
        location = result["geometry"]["location"]
        
        geocode_result = {
            "address": address,
            "formatted_address": result["formatted_address"],
            "latitude": location["lat"],
            "longitude": location["lng"],
            "place_id": result["place_id"],
            "types": result.get("types", [])
        }
        
        # Save to state
        tool_context.state["geocode_result"] = geocode_result
        
        logger.info(f"Geocoded address: {address} -> {location['lat']},{location['lng']}")
        
        return {
            "status": "success",
            "result": geocode_result
        }
    
    except Exception as e:
        logger.error(f"Error geocoding address: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to geocode address: {str(e)}"
        }


def get_directions(
    tool_context: ToolContext,
    origin: str,
    destination: str,
    mode: str = "driving",
    alternatives: bool = True
) -> Dict[str, Any]:
    """Get directions between two locations using Google Maps Directions API.
    
    Args:
        origin (str): Starting location (address or "lat,lng")
        destination (str): Ending location (address or "lat,lng")
        mode (str): Travel mode - "driving", "walking", "bicycling", "transit"
        alternatives (bool): Whether to return alternative routes
        
    Returns:
        dict: Directions with routes, distances, and travel times
    """
    try:
        if not GOOGLE_MAPS_API_KEY:
            return {
                "status": "error",
                "message": "GOOGLE_MAPS_API_KEY not configured"
            }
        
        # Call Google Maps Directions API
        directions_url = f"{GOOGLE_MAPS_BASE}/directions/json"
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "alternatives": alternatives,
            "key": GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(directions_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] != "OK":
            return {
                "status": "error",
                "message": f"Directions failed: {data.get('status')}"
            }
        
        # Extract routes
        routes = []
        for route in data["routes"]:
            leg = route["legs"][0]  # First leg
            routes.append({
                "summary": route.get("summary", "Route"),
                "distance": leg["distance"]["text"],
                "distance_meters": leg["distance"]["value"],
                "duration": leg["duration"]["text"],
                "duration_seconds": leg["duration"]["value"],
                "start_address": leg["start_address"],
                "end_address": leg["end_address"],
                "steps": [
                    {
                        "instruction": step["html_instructions"],
                        "distance": step["distance"]["text"],
                        "duration": step["duration"]["text"]
                    }
                    for step in leg["steps"][:5]  # First 5 steps only
                ]
            })
        
        directions_result = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "routes": routes
        }
        
        # Save to state
        tool_context.state["directions"] = directions_result
        
        logger.info(f"Got directions: {origin} -> {destination}, {len(routes)} routes")
        
        return {
            "status": "success",
            "result": directions_result
        }
    
    except Exception as e:
        logger.error(f"Error getting directions: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get directions: {str(e)}"
        }


def search_nearby_places(
    tool_context: ToolContext,
    location: str,
    place_type: str,
    radius: int = 5000,
    keyword: Optional[str] = None
) -> Dict[str, Any]:
    """Search for nearby places using Google Maps Places API.
    
    Args:
        location (str): Center point as "lat,lng"
        place_type (str): Type of place (e.g., "hospital", "shelter", "pharmacy", "gas_station")
        radius (int): Search radius in meters (default 5000m = 5km)
        keyword (str): Optional keyword to refine search (e.g., "emergency")
        
    Returns:
        dict: List of nearby places with details
    """
    try:
        if not GOOGLE_MAPS_API_KEY:
            return {
                "status": "error",
                "message": "GOOGLE_MAPS_API_KEY not configured"
            }
        
        # Call Google Maps Places Nearby Search API
        places_url = f"{GOOGLE_MAPS_BASE}/place/nearbysearch/json"
        params = {
            "location": location,
            "radius": radius,
            "type": place_type,
            "key": GOOGLE_MAPS_API_KEY
        }
        
        if keyword:
            params["keyword"] = keyword
        
        response = requests.get(places_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] not in ["OK", "ZERO_RESULTS"]:
            return {
                "status": "error",
                "message": f"Places search failed: {data.get('status')}"
            }
        
        # Extract places
        places = []
        for place in data.get("results", [])[:10]:  # Limit to 10 results
            places.append({
                "name": place.get("name"),
                "address": place.get("vicinity"),
                "location": place["geometry"]["location"],
                "place_id": place.get("place_id"),
                "types": place.get("types", []),
                "rating": place.get("rating"),
                "open_now": place.get("opening_hours", {}).get("open_now")
            })
        
        search_result = {
            "location": location,
            "place_type": place_type,
            "radius_meters": radius,
            "keyword": keyword,
            "places": places,
            "count": len(places)
        }
        
        # Save to state
        tool_context.state["nearby_places"] = search_result
        
        logger.info(f"Found {len(places)} places of type '{place_type}' near {location}")
        
        return {
            "status": "success",
            "result": search_result
        }
    
    except Exception as e:
        logger.error(f"Error searching nearby places: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to search places: {str(e)}"
        }


def generate_map(
    tool_context: ToolContext,
    center_lat: float,
    center_lng: float,
    zoom: int = 12,
    markers: Optional[list] = None,
    title: str = "Map"
) -> Dict[str, Any]:
    """Generate a Google Maps URL with markers for visualization.
    
    Args:
        center_lat (float): Latitude for map center
        center_lng (float): Longitude for map center
        zoom (int): Zoom level (1-20, default 12)
        markers (list): Optional list of marker dicts with 'lat', 'lng', 'title', 'color'
        title (str): Title for the map
        
    Returns:
        dict: Google Maps URL and marker information
    """
    try:
        # Build Google Maps URL with markers
        # Format: https://www.google.com/maps/dir/?api=1&destination=lat,lng&waypoints=lat1,lng1|lat2,lng2
        
        if markers and len(markers) > 0:
            # Use first marker as destination
            first_marker = markers[0]
            dest_lat = first_marker.get('lat', center_lat)
            dest_lng = first_marker.get('lng', center_lng)
            
            # Build markers list for URL
            marker_params = []
            for marker in markers:
                lat = marker.get('lat')
                lng = marker.get('lng')
                label = marker.get('title', 'Location')
                if lat and lng:
                    marker_params.append(f"{lat},{lng}")
            
            # Create Google Maps URL with multiple markers (map mode, not satellite)
            if len(marker_params) == 1:
                map_url = f"https://www.google.com/maps/search/?api=1&query={dest_lat},{dest_lng}&zoom={zoom}&map_action=map"
            else:
                # For multiple markers, use directions API to show all points
                waypoints = "|".join(marker_params[1:]) if len(marker_params) > 1 else ""
                if waypoints:
                    map_url = f"https://www.google.com/maps/dir/?api=1&destination={marker_params[0]}&waypoints={waypoints}&map_action=map"
                else:
                    map_url = f"https://www.google.com/maps/search/?api=1&query={dest_lat},{dest_lng}&zoom={zoom}&map_action=map"
        else:
            # No markers, just center location (map mode, not satellite)
            map_url = f"https://www.google.com/maps/search/?api=1&query={center_lat},{center_lng}&zoom={zoom}&map_action=map"
        
        # Store map data in state
        tool_context.state["map_data"] = {
            "center": {"lat": center_lat, "lng": center_lng},
            "zoom": zoom,
            "markers": markers or [],
            "map_url": map_url
        }
        
        # Build marker summary
        marker_summary = []
        if markers:
            for i, marker in enumerate(markers, 1):
                title = marker.get('title', f'Location {i}')
                lat = marker.get('lat')
                lng = marker.get('lng')
                marker_summary.append(f"{i}. {title} ({lat}, {lng})")
        
        logger.info(f"Generated map URL centered at ({center_lat}, {center_lng}) with {len(markers or [])} markers")
        
        return {
            "status": "success",
            "message": f"Generated map with {len(markers or [])} marker(s)",
            "map_url": map_url,
            "center": {"lat": center_lat, "lng": center_lng},
            "zoom": zoom,
            "markers": marker_summary,
            "instruction": "Open the map_url in a browser to view the interactive map with all markers"
        }
    
    except Exception as e:
        logger.error(f"Error generating map: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to generate map: {str(e)}"
        }
