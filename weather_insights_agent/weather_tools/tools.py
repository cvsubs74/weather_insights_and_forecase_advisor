import os
import json
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps
from google.adk.tools.tool_context import ToolContext
from google.cloud import bigquery
import google.auth
from dotenv import load_dotenv

# Configure detailed logging for tools
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Tool call tracking decorator
def track_tool_call(tool_name):
    """Decorator to track tool calls with detailed logging"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger.info(f"{'='*80}")
            logger.info(f"🔧 TOOL CALL: {tool_name}")
            logger.info(f"   Function: {func.__name__}")
            
            # Log parameters (skip tool_context)
            params = {}
            if len(args) > 1:
                params['args'] = str(args[1:])[:200]  # Truncate long args
            if kwargs:
                params['kwargs'] = {k: str(v)[:100] for k, v in kwargs.items()}
            
            if params:
                logger.info(f"   Parameters: {params}")
            
            logger.info(f"{'='*80}")
            
            try:
                result = func(*args, **kwargs)
                
                # Log result summary
                logger.info(f"{'='*80}")
                logger.info(f"✅ TOOL SUCCESS: {tool_name}")
                if isinstance(result, dict):
                    if 'status' in result:
                        logger.info(f"   Status: {result.get('status')}")
                    if 'count' in result:
                        logger.info(f"   Count: {result.get('count')}")
                    if 'alerts' in result:
                        logger.info(f"   Alerts returned: {len(result.get('alerts', []))}")
                logger.info(f"{'='*80}")
                
                return result
            except Exception as e:
                logger.error(f"{'='*80}")
                logger.error(f"❌ TOOL ERROR: {tool_name}")
                logger.error(f"   Error: {str(e)}")
                logger.error(f"{'='*80}")
                raise
        return wrapper
    return decorator

# Load environment variables
load_dotenv()

# Initialize BigQuery client for direct queries
application_default_credentials, project_id = google.auth.default()
if not project_id:
    project_id = os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")

# Create BigQuery client
bq_client = bigquery.Client(
    credentials=application_default_credentials,
    project=project_id
)

# NWS API Configuration
NWS_API_BASE = "https://api.weather.gov"
NWS_USER_AGENT = os.getenv("NWS_USER_AGENT", "(WeatherAdvisor, contact@example.com)")
NWS_HEADERS = {
    "User-Agent": NWS_USER_AGENT,
    "Accept": "application/geo+json"
}


# BigQuery Helper Functions for Historical Weather Data and Census Demographics
@track_tool_call("get_census_demographics")
def get_census_demographics(
    tool_context: ToolContext,
    city: str,
    state: str
) -> Dict[str, Any]:
    """Get census demographics for a city from BigQuery public census datasets.
    
    Args:
        city (str): City name (e.g., "San Ramon")
        state (str): State abbreviation (e.g., "CA")
        
    Returns:
        dict: Census demographics including population, age, income, housing
    """
    try:
        # Query BigQuery census_bureau_acs dataset for city demographics
        # Map state abbreviations to FIPS codes
        state_fips = {
            'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
            'DE': '10', 'DC': '11', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17',
            'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
            'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31',
            'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
            'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46',
            'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
            'WI': '55', 'WY': '56'
        }
        
        state_code = state_fips.get(state.upper())
        if not state_code:
            return {
                "status": "error",
                "message": f"Invalid state abbreviation: {state}. Please use 2-letter state code (e.g., CA, TX, NY)"
            }
        
        query = f"""
        SELECT 
            geo_id,
            total_pop,
            median_age,
            median_income,
            housing_units,
            households,
            male_pop,
            female_pop,
            white_pop,
            black_pop,
            asian_pop,
            hispanic_pop,
            bachelors_degree,
            median_rent,
            owner_occupied,
            renter_occupied
        FROM `bigquery-public-data.census_bureau_acs.censustract_2018_5yr` 
        WHERE SUBSTR(geo_id, 1, 2) = '{state_code}'
        LIMIT 100
        """
        
        logger.info(f"Querying census demographics for {city}, {state}")
        query_job = bq_client.query(query)
        results = query_job.result()
        
        demographics = []
        total_population = 0
        total_households = 0
        
        for row in results:
            demographics.append({
                "geo_id": row.geo_id,
                "population": row.total_pop,
                "median_age": row.median_age,
                "median_income": row.median_income,
                "housing_units": row.housing_units,
                "households": row.households,
                "demographics": {
                    "male": row.male_pop,
                    "female": row.female_pop,
                    "white": row.white_pop,
                    "black": row.black_pop,
                    "asian": row.asian_pop,
                    "hispanic": row.hispanic_pop
                },
                "education": {
                    "bachelors_degree": row.bachelors_degree
                },
                "housing": {
                    "median_rent": row.median_rent,
                    "owner_occupied": row.owner_occupied,
                    "renter_occupied": row.renter_occupied
                }
            })
            total_population += row.total_pop or 0
            total_households += row.households or 0
        
        # Calculate aggregates
        if demographics:
            avg_median_age = sum(d["median_age"] or 0 for d in demographics) / len(demographics)
            avg_median_income = sum(d["median_income"] or 0 for d in demographics) / len(demographics)
            
            summary = {
                "city": city,
                "state": state,
                "total_population": total_population,
                "total_households": total_households,
                "avg_median_age": round(avg_median_age, 1),
                "avg_median_income": round(avg_median_income, 2),
                "census_tracts": len(demographics),
                "tracts": demographics
            }
        else:
            summary = {
                "city": city,
                "state": state,
                "message": f"No census data found for {city}, {state}. Try searching by county name instead."
            }
        
        # Save to state
        tool_context.state["census_demographics"] = summary
        
        logger.info(f"Retrieved demographics for {len(demographics)} census tracts")
        
        return {
            "status": "success",
            "data": summary
        }
    
    except Exception as e:
        logger.error(f"Error querying census demographics: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to query census data: {str(e)}"
        }


@track_tool_call("find_nearest_weather_station")
def find_nearest_weather_station(
    tool_context: ToolContext,
    latitude: float,
    longitude: float,
    state: str
) -> Dict[str, Any]:
    """Find the top 3 nearest weather stations to coordinates using BigQuery NOAA GSOD dataset.
    
    Args:
        latitude (float): Latitude of the location (e.g., 37.7798)
        longitude (float): Longitude of the location (e.g., -121.9780)
        state (str): State abbreviation (e.g., "CA") to filter stations
        
    Returns:
        dict: Top 3 nearest weather stations with IDs, names, and distances
    """
    try:
        # Query to find top 3 nearest stations using Euclidean distance
        query = f"""
        SELECT
            usaf,
            wban,
            name,
            state,
            lat,
            lon,
            SQRT(POW((lat - {latitude}), 2) + POW((lon - ({longitude})), 2)) as distance
        FROM
            `bigquery-public-data.noaa_gsod.stations`
        WHERE
            state = '{state}'
            AND lat IS NOT NULL
            AND lon IS NOT NULL
        ORDER BY
            distance
        LIMIT 3
        """
        
        logger.info(f"Finding top 3 nearest weather stations for coordinates ({latitude}, {longitude}) in {state}")
        query_job = bq_client.query(query)
        results = query_job.result()
        
        stations = []
        for row in results:
            # Use USAF as the station identifier (used in stn field for queries)
            station = {
                "usaf": row.usaf,
                "wban": row.wban,
                "name": row.name,
                "state": row.state,
                "latitude": row.lat,
                "longitude": row.lon,
                "distance": row.distance
            }
            stations.append(station)
            logger.info(f"Found station #{len(stations)}: {row.usaf} - {row.name} (distance: {row.distance:.4f})")
        
        if stations:
            tool_context.state["weather_stations"] = stations
            
            return {
                "status": "success",
                "stations": stations,
                "count": len(stations)
            }
        
        return {
            "status": "error",
            "message": f"No weather stations found for {state}"
        }
    
    except Exception as e:
        logger.error(f"Error finding weather stations: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to find weather stations: {str(e)}"
        }


@track_tool_call("query_historical_weather")
def query_historical_weather(
    tool_context: ToolContext,
    usaf_ids: list,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """Query historical weather data from BigQuery public datasets with fallback to multiple stations.
    
    Args:
        usaf_ids (list): List of USAF station IDs to try (e.g., ["724927", "724930"])
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
        
    Returns:
        dict: Historical weather observations from the first station with data
    """
    # Extract year from start_date for table suffix
    start_year = start_date.split('-')[0]
    end_year = end_date.split('-')[0]
    table_suffix = "*"  # Use wildcard to cover multiple years
    
    # Try each station in order until we get data
    for idx, usaf_id in enumerate(usaf_ids):
        try:
            logger.info(f"Attempting to query station #{idx+1}: {usaf_id}")
            
            # Build query using USAF as stn field
            query = f"""
            SELECT 
                CAST(year AS STRING) || '-' || LPAD(CAST(mo AS STRING), 2, '0') || '-' || LPAD(CAST(da AS STRING), 2, '0') as date,
                temp,
                max,
                min,
                prcp,
                sndp,
                wdsp,
                mxpsd
            FROM `bigquery-public-data.noaa_gsod.gsod{table_suffix}`
            WHERE stn = '{usaf_id}'
                AND CAST(year AS STRING) || '-' || LPAD(CAST(mo AS STRING), 2, '0') || '-' || LPAD(CAST(da AS STRING), 2, '0') 
                    BETWEEN '{start_date}' AND '{end_date}'
            ORDER BY year DESC, mo DESC, da DESC
            LIMIT 100
            """
            
            query_job = bq_client.query(query)
            results = query_job.result()
            
            records = []
            for row in results:
                records.append({
                    "date": str(row.date),
                    "temperature": row.temp,
                    "max_temp": row.max,
                    "min_temp": row.min,
                    "precipitation": row.prcp,
                    "snow_depth": row.sndp,
                    "wind_speed": row.wdsp,
                    "max_wind_speed": row.mxpsd
                })
            
            if records:
                tool_context.state["historical_weather"] = {
                    "usaf_id": usaf_id,
                    "records": records,
                    "count": len(records)
                }
                
                logger.info(f"Successfully retrieved {len(records)} records from station {usaf_id}")
                
                return {
                    "status": "success",
                    "usaf_id": usaf_id,
                    "records": records,
                    "count": len(records),
                    "station_tried": idx + 1,
                    "total_stations": len(usaf_ids)
                }
            else:
                logger.warning(f"No data found for station {usaf_id}, trying next station...")
                
        except Exception as e:
            logger.error(f"Error querying station {usaf_id}: {str(e)}, trying next station...")
            continue
    
    # If we get here, none of the stations had data
    logger.error(f"No data found for any of the {len(usaf_ids)} stations")
    return {
        "status": "error",
        "message": f"Failed to retrieve data from any of the {len(usaf_ids)} nearest weather stations",
        "stations_tried": usaf_ids
    }


@track_tool_call("get_weather_statistics")
def get_weather_statistics(
    tool_context: ToolContext,
    station_id: str,
    year: int,
    month: Optional[int] = None
) -> Dict[str, Any]:
    """Get weather statistics (averages, extremes) from BigQuery.
    
    Args:
        station_id (str): Weather station ID
        year (int): Year for statistics
        month (int): Optional month (1-12) for monthly stats
        
    Returns:
        dict: Weather statistics including averages and extremes
    """
    try:
        if month:
            date_filter = f"AND EXTRACT(MONTH FROM date) = {month}"
            period = f"{year}-{month:02d}"
        else:
            date_filter = ""
            period = str(year)
        
        query = f"""
        SELECT 
            AVG(temp) as avg_temp,
            MAX(max) as highest_temp,
            MIN(min) as lowest_temp,
            AVG(prcp) as avg_precipitation,
            SUM(prcp) as total_precipitation,
            AVG(wdsp) as avg_wind_speed,
            MAX(mxspd) as max_wind_speed,
            COUNT(*) as days_recorded
        FROM `bigquery-public-data.noaa_gsod.gsod{year}`
        WHERE stn = '{station_id}'
            {date_filter}
        """
        
        query_job = bq_client.query(query)
        results = query_job.result()
        
        row = next(results)
        stats = {
            "station_id": station_id,
            "period": period,
            "avg_temperature": float(row.avg_temp) if row.avg_temp else None,
            "highest_temperature": float(row.highest_temp) if row.highest_temp else None,
            "lowest_temperature": float(row.lowest_temp) if row.lowest_temp else None,
            "avg_precipitation": float(row.avg_precipitation) if row.avg_precipitation else None,
            "total_precipitation": float(row.total_precipitation) if row.total_precipitation else None,
            "avg_wind_speed": float(row.avg_wind_speed) if row.avg_wind_speed else None,
            "max_wind_speed": float(row.max_wind_speed) if row.max_wind_speed else None,
            "days_recorded": int(row.days_recorded)
        }
        
        tool_context.state["weather_statistics"] = stats
        
        logger.info(f"Retrieved weather statistics for {period}")
        
        return {
            "status": "success",
            "statistics": stats
        }
    
    except Exception as e:
        logger.error(f"Error getting weather statistics: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get statistics: {str(e)}"
        }


@track_tool_call("get_nws_forecast")
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


@track_tool_call("get_hourly_forecast")
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


@track_tool_call("get_nws_alerts")
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
        severity_counts = {"Extreme": 0, "Severe": 0, "Moderate": 0, "Minor": 0, "Unknown": 0}
        
        for feature in alerts_data.get("features", []):
            props = feature.get("properties", {})
            
            # Filter by severity if specified
            if severity and props.get("severity") != severity:
                continue
            
            alert_severity = props.get("severity", "Unknown")
            severity_counts[alert_severity] = severity_counts.get(alert_severity, 0) + 1
            
            alerts.append({
                "event": props.get("event"),
                "severity": alert_severity,
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
        
        # For large alert sets, only return top critical alerts to prevent timeout
        total_count = len(alerts)
        if total_count > 20:
            # Sort by severity priority: Extreme > Severe > Moderate > Minor
            severity_priority = {"Extreme": 0, "Severe": 1, "Moderate": 2, "Minor": 3, "Unknown": 4}
            alerts.sort(key=lambda x: severity_priority.get(x["severity"], 4))
            # Keep only top 15 most critical alerts
            alerts = alerts[:15]
            logger.info(f"Limiting to top 15 critical alerts out of {total_count} total")
        
        # Save to state
        tool_context.state["alerts"] = {
            "alerts": alerts,
            "count": total_count,
            "severity_breakdown": severity_counts,
            "timestamp": datetime.now().isoformat(),
            "limited": total_count > 20
        }
        
        logger.info(f"Retrieved {total_count} active alerts, returning {len(alerts)}")
        
        return {
            "status": "success",
            "alerts": alerts,
            "total_count": total_count,
            "returned_count": len(alerts),
            "severity_breakdown": severity_counts,
            "timestamp": datetime.now().isoformat(),
            "limited": total_count > 20,
            "note": f"Showing top {len(alerts)} critical alerts out of {total_count} total" if total_count > 20 else None
        }
    
    except Exception as e:
        logger.error(f"Error getting NWS alerts: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get alerts: {str(e)}"
        }


@track_tool_call("get_current_conditions")
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


@track_tool_call("get_hurricane_track")
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


@track_tool_call("geocode_address")
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


@track_tool_call("get_directions")
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


@track_tool_call("search_nearby_places")
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


@track_tool_call("generate_map")
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
        dict: Google Maps URL and marker information with structured marker data
    """
    try:
        # Build Google Maps URL with markers
        # For multiple markers, use the directions API format with waypoints
        
        if markers and len(markers) > 0:
            # Build a URL that shows all markers
            # Format: https://www.google.com/maps/dir/?api=1&destination=lat,lng&waypoints=lat1,lng1|lat2,lng2
            
            # Use first marker as destination
            first_marker = markers[0]
            dest_lat = first_marker.get('lat', center_lat)
            dest_lng = first_marker.get('lng', center_lng)
            
            # Build waypoints from remaining markers (up to 9 waypoints max for Google Maps)
            waypoints = []
            for marker in markers[1:9]:  # Limit to 8 additional waypoints
                lat = marker.get('lat')
                lng = marker.get('lng')
                if lat and lng:
                    waypoints.append(f"{lat},{lng}")
            
            # Construct the URL
            map_url = f"https://www.google.com/maps/dir/?api=1&destination={dest_lat},{dest_lng}"
            if waypoints:
                map_url += f"&waypoints={('|').join(waypoints)}"
            map_url += "&travelmode=driving"
        else:
            # No markers, just center location
            map_url = f"https://www.google.com/maps/search/?api=1&query={center_lat},{center_lng}&zoom={zoom}"
        
        # Store map data in state with structured markers for frontend
        structured_markers = []
        if markers:
            for marker in markers:
                structured_markers.append({
                    "lat": marker.get('lat'),
                    "lng": marker.get('lng'),
                    "title": marker.get('title', 'Location'),
                    "address": marker.get('address', '')
                })
        
        tool_context.state["map_data"] = {
            "center": {"lat": center_lat, "lng": center_lng},
            "zoom": zoom,
            "markers": structured_markers,
            "map_url": map_url
        }
        
        # Build marker summary for agent response
        marker_summary = []
        if markers:
            for i, marker in enumerate(markers, 1):
                title = marker.get('title', f'Location {i}')
                lat = marker.get('lat')
                lng = marker.get('lng')
                marker_summary.append(f"{i}. {title} ({lat}, {lng})")
        
        logger.info(f"Generated map URL centered at ({center_lat}, {center_lng}) with {len(markers or [])} markers")
        
        # Return structured data that frontend can parse
        return {
            "status": "success",
            "message": f"Generated map with {len(markers or [])} marker(s)",
            "map_url": map_url,
            "center": {"lat": center_lat, "lng": center_lng},
            "zoom": zoom,
            "markers": structured_markers,  # Return structured markers for frontend
            "marker_summary": marker_summary,
            "instruction": "View map: " + map_url
        }
    
    except Exception as e:
        logger.error(f"Error generating map: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to generate map: {str(e)}"
        }
