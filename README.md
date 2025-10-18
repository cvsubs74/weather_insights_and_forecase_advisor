# Weather Insights and Forecast Advisor - Multi-Agent Architecture

## Overview

The Weather Insights and Forecast Advisor is an intelligent multi-agent system designed to provide critical weather-related insights for emergency management, public safety, and disaster preparedness. The system combines real-time weather forecasts with historical demographic and geographic data to enable data-driven decision-making during severe weather events.

**Primary Theme:** Climate & Public Safety (Agents for Impact '25)

**Core Value Proposition:** Correlate real-time weather forecasts with historical data to identify vulnerable populations and high-risk areas, enabling proactive emergency response and resource allocation.

---

## System Architecture

The Weather Insights and Forecast Advisor follows a **Specialized Multi-Agent Pattern** with five distinct agents:

1. **Root Coordinator Agent** - User interface and intelligent query routing
2. **Location Services Agent** - Google Maps API integration for geocoding, directions, and emergency resources
3. **NWS Forecast Agent** - National Weather Service API for real-time weather data
4. **BigQuery Data Agent** - Historical weather and demographic data analysis
5. **Correlation Insights Agent** - Two-tier risk analysis (simple vs complex events)

### Architecture Pattern

```
User Query → Root Coordinator → Route to Specialist Agents → Insights Agent → Response
                ↓                         ↓                           ↓
         Assess Complexity    Location + Forecast + Data    Simple or Data-Driven Analysis
                                      ↓
                              Google Maps Integration
                         (Geocoding, Directions, Maps)
```

---

## Use Case Examples

### Example 1: Hurricane Evacuation Priority

**User Query:**
> "We have a Category 3 hurricane approaching. Which census tracts in the predicted path have a history of major flooding and high elderly populations, requiring immediate evacuation priority?"

**System Flow:**
1. **Root Agent** interprets query → identifies need for forecast + historical data + demographics
2. **Forecast Agent** calls NWS API → gets hurricane path, intensity, timing
3. **Data Agent** queries BigQuery:
   - Census tracts in predicted path
   - Historical flooding data (FEMA flood zones, past events)
   - Demographic data (elderly population %, mobility limitations)
4. **Insights Agent** correlates data:
   - Ranks census tracts by risk score (flood history × elderly population × hurricane intensity)
   - Generates evacuation priority list
   - Identifies resource needs (medical transport, shelters)
   - Provides actionable recommendations

**Output:**
- Prioritized list of census tracts requiring immediate evacuation
- Population counts and special needs
- Historical context (past flooding severity)
- Resource allocation recommendations

### Example 2: Heat Wave Analysis

**User Query:**
> "Show me the 48-hour severe heat risk for this city compared to the duration and intensity of the worst heat wave on record to help us stage cooling centers."

**System Flow:**
1. **Root Agent** interprets query → identifies need for forecast + historical comparison
2. **Forecast Agent** calls NWS API → gets 48-hour heat forecast (temperature, heat index, duration)
3. **Data Agent** queries BigQuery:
   - Historical heat wave data for the city
   - Worst heat wave on record (duration, max temp, heat index)
   - Vulnerable populations (elderly, low-income, areas without AC)
   - Past heat-related incidents (hospitalizations, deaths)
4. **Insights Agent** correlates data:
   - Compares current forecast to historical worst-case
   - Identifies high-risk neighborhoods
   - Calculates expected impact based on historical patterns
   - Recommends cooling center locations and capacity

**Output:**
- Heat severity comparison (current vs. historical worst)
- High-risk neighborhoods with vulnerable populations
- Cooling center staging recommendations
- Expected resource needs based on historical data

---

## Component Details

### 1. Root Coordinator Agent: `weather_advisor_coordinator`

**Purpose:** Entry point that greets users, interprets queries, and orchestrates the workflow

**Key Responsibilities:**
- Welcome users and explain capabilities
- Parse natural language queries to understand intent
- Identify required data sources (forecast, historical, demographic)
- Route to appropriate specialist agents
- Coordinate multi-agent workflows
- Present final insights to users

**Routing Logic:**
```python
if query requires location/geocoding:
    → Call location_services_agent
if query requires weather forecast:
    → Call location_services_agent (geocode) → nws_forecast_agent
if query requires risk analysis:
    if simple_event (rip currents, beach hazards):
        → Call correlation_insights_agent (common-sense analysis)
    if complex_event (hurricanes, major floods):
        → Call correlation_insights_agent → bigquery_data_agent (data-driven)
if query requires directions/routes:
    → Call location_services_agent
if query requires map visualization:
    → Call location_services_agent.generate_map()
```

**Configuration:**
- Model: `gemini-2.5-flash`
- Temperature: `0.3` (balanced creativity and consistency)
- Sub-agents: `location_services_agent`, `nws_forecast_agent`, `bigquery_data_agent`, `correlation_insights_agent`
- Execution: Proactive, no confirmation prompts for standard queries

**Example Interactions:**
- "What's the weather forecast for Miami this weekend?"
- "Show me census tracts with high flood risk in Houston"
- "Hurricane approaching - which areas need evacuation priority?"

---

### 2. Location Services Agent: `location_services_agent`

**Purpose:** Provide geocoding, directions, emergency resource location, and map generation using Google Maps API

**Key Capabilities:**
- Geocode addresses to coordinates
- Calculate driving directions with multiple route options
- Search for nearby emergency resources (shelters, hospitals)
- Generate interactive map URLs with markers
- Support evacuation route planning

**Google Maps API Integration:**

1. **Geocoding API:**
   - Convert addresses to latitude/longitude coordinates
   - Reverse geocoding (coordinates to address)
   - Returns: formatted address, coordinates, place_id

2. **Directions API:**
   - Calculate routes between locations
   - Multiple route alternatives
   - Travel time and distance estimates
   - Support for different travel modes (driving, walking, transit)

3. **Places API:**
   - Search for nearby emergency resources
   - Filter by place type (hospital, shelter, pharmacy)
   - Radius-based searches
   - Returns: name, address, rating, distance

4. **Maps JavaScript API:**
   - Generate Google Maps URLs with markers
   - Support multiple markers for affected areas
   - Visual representation of emergency zones
   - Color-coded markers (red for hazards, blue for shelters)

**Tools:**
- `geocode_address(address)` - Convert address to coordinates
- `get_directions(origin, destination, mode)` - Calculate routes
- `search_nearby_places(location, place_type, radius)` - Find emergency resources
- `generate_map(center_lat, center_lng, markers, zoom)` - Create map URLs

**Example Usage:**
```python
# Geocode flood warning location
result = geocode_address("Astor, FL")
# Returns: {"lat": 29.1485, "lng": -81.5043, "formatted_address": "Astor, FL 32102"}

# Find nearest shelters
shelters = search_nearby_places(
    location="29.1485,-81.5043",
    place_type="shelter",
    radius=10000  # 10km
)

# Generate map with affected areas
map_url = generate_map(
    center_lat=29.1485,
    center_lng=-81.5043,
    markers=[
        {"lat": 29.1485, "lng": -81.5043, "title": "Flood Warning Area", "color": "red"},
        {"lat": 29.1600, "lng": -81.5200, "title": "Emergency Shelter", "color": "blue"}
    ],
    zoom=12
)
```

**State Management:**
- Writes to `state['geocode_result']` - Geocoded location data
- Writes to `state['directions']` - Route information
- Writes to `state['nearby_places']` - Emergency resource locations
- Writes to `state['map_data']` - Generated map URLs

---

### 3. NWS Forecast Agent: `nws_forecast_agent`

**Purpose:** Retrieve real-time weather data from National Weather Service API

**Key Updates:**
- Uses coordinates from state (provided by location_services_agent)
- Groups day/night forecast periods into calendar days
- Presents 7-day forecasts correctly (14 periods = 7 days)
- No confirmation prompts - executes immediately when coordinates available

**Forecast Presentation:**
- Combines day and night periods: "Saturday: High 80°F (sunny), Low 54°F (clear)"
- Instead of: "Saturday: High 80°F" and "Saturday Night: Low 54°F" separately

---

### 4. BigQuery Data Agent: `bigquery_data_agent`

**Purpose:** Query BigQuery datasets for historical weather, demographic, and geographic data

**Key Capabilities:**
- Access BigQuery public datasets
- Query census demographic data
- Retrieve historical weather events
- Access FEMA flood zone data
- Query geographic/geospatial data
- Aggregate and filter data based on user criteria

**BigQuery Datasets:**

1. **Weather & Climate (Primary):**
   - `bigquery-public-data.noaa_gsod.gsod2025` - Daily weather summaries (temperature, precipitation, wind)
   - `bigquery-public-data.ghcn_d.ghcnd_stations` - Weather station locations
   - `bigquery-public-data.ghcn_d.ghcnd_2025` - Current daily climate observations
   - `bigquery-public-data.ghcn_d.ghcnd_2024` - Historical daily data
   - `bigquery-public-data.ghcn_m.ghcnm_tavg` - Monthly temperature averages
   - `bigquery-public-data.ghcn_m.*` - All monthly climate tables

2. **Census Data:**
   - `bigquery-public-data.census_bureau_acs.censustract_2020_5yr` - Demographics
   - Age, income, housing, population density
   - Census tract level granularity

3. **Geospatial:**
   - `bigquery-public-data.geo_us_boundaries` - US geographic boundaries
   - Census tracts, counties, states
   - Coordinate-based queries

**Tools:**
- `bigquery_toolset` - Full BigQuery query capabilities
- `execute_query(sql_query)` - Run SQL queries
- `get_schema(dataset, table)` - Explore table structures
- `aggregate_data(data, groupby, metrics)` - Data aggregation

**Example Queries:**

```sql
-- Census tracts with high elderly population
SELECT 
  geo_id,
  total_pop,
  pop_65_over,
  (pop_65_over / total_pop * 100) as elderly_percentage,
  median_income
FROM `bigquery-public-data.census_bureau_acs.censustract_2020_5yr`
WHERE state_code = 'FL' AND county_code = '086'
  AND (pop_65_over / total_pop) > 0.20
ORDER BY elderly_percentage DESC;

-- Historical heat waves
SELECT 
  date,
  MAX(temp) as max_temp,
  AVG(temp) as avg_temp,
  COUNT(*) as days_over_100
FROM `bigquery-public-data.noaa_gsod.gsod2023`
WHERE stn = '722020' -- Miami station
  AND temp > 100
GROUP BY date
ORDER BY max_temp DESC
LIMIT 10;
```

**State Management:**
- Writes to `state['query_results']` - Raw query results
- Writes to `state['demographic_data']` - Processed demographic info
- Writes to `state['historical_data']` - Historical weather/disaster data

---

### 5. Correlation Insights Agent: `correlation_insights_agent`

**Purpose:** Provide two-tier risk analysis - simple common-sense analysis for minor events, data-driven analysis for complex events

**Two-Tier Analysis Approach:**

**TIER 1 - Simple Events (Immediate Common-Sense Analysis):**
- Rip Current Statements
- Beach Hazards Statements
- Minor Coastal Flooding
- Wind Advisories
- Small Craft Advisories

**Process:**
1. Check state for alert details
2. Provide immediate risk assessment based on alert severity
3. Identify vulnerable groups (beachgoers, tourists, children)
4. Recommend standard safety actions
5. NO BigQuery queries needed

**Example - Rip Current Statement:**
```
Risk Assessment:
- Moderate risk to beachgoers and swimmers
- Primary vulnerable groups: tourists unfamiliar with conditions, children, inexperienced swimmers
- Recommended actions: Increase lifeguard presence, post warning signs, public announcements
- Standard coastal safety protocol applies
```

**TIER 2 - Complex Events (Data-Driven Analysis):**
- Hurricane warnings/watches
- Major flood warnings
- Extreme heat warnings
- Tornado warnings affecting large areas
- Multi-day severe weather events

**Process:**
1. Check state for alert details and location data
2. Call bigquery_data_agent to query:
   - Historical weather events in affected area
   - Demographic data (elderly population, vulnerable groups)
   - Census tract information
   - Past incident patterns
3. Perform correlation analysis with specific numbers
4. Present data-driven risk assessment with evacuation priorities

**Example - Hurricane Warning:**
```
Risk Assessment (Data-Driven):
- Based on 15 historical hurricane impacts in South Florida
- Census data shows 285,000 elderly residents (18% of population)
- 12 census tracts identified as high-risk (flood history + vulnerable populations)
- Risk score: 9.2/10 for Census Tract 12086001100
- Evacuation priority: Immediate for 8,500 residents
```

---

## Removed Agent: Forecast Agent Details

**Note:** The detailed NWS Forecast Agent section has been consolidated above. Key capabilities remain:

**Purpose:** Retrieve real-time and forecasted weather data from the National Weather Service API

**Key Capabilities:**
- Current weather conditions
- 7-day forecasts
- Hourly forecasts
- Severe weather alerts
- Hurricane/tropical storm tracking
- Heat advisories and warnings
- Flood watches and warnings

**NWS API Endpoints (Live Weather Data):**

1. **Points API:** Get forecast office and grid coordinates
   - `https://api.weather.gov/points/{lat},{lon}`
   - Returns: Grid coordinates, forecast office, observation stations
   - Use: Initial setup to get grid points for any location

2. **Forecast API:** Get detailed forecasts
   - `https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast`
   - `https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast/hourly`
   - Returns: 7-day forecast with detailed periods, hourly temperature/conditions
   - Update frequency: Every 1-3 hours

3. **Alerts API:** Get active weather alerts (LIVE)
   - `https://api.weather.gov/alerts/active?area={state}`
   - `https://api.weather.gov/alerts/active?point={lat},{lon}`
   - `https://api.weather.gov/alerts/active?zone={zoneId}`
   - Returns: Real-time severe weather alerts, watches, warnings
   - Alert types: Hurricane, Tornado, Flood, Heat, Winter Storm, etc.
   - Update frequency: Real-time (seconds)

4. **Stations API:** Get current observations (LIVE)
   - `https://api.weather.gov/stations/{stationId}/observations/latest`
   - `https://api.weather.gov/stations/{stationId}/observations`
   - Returns: Current temperature, humidity, wind, pressure, visibility
   - Update frequency: Every 5-60 minutes depending on station

5. **Radar Stations API:** Get radar data
   - `https://api.weather.gov/radar/stations/{stationId}`
   - Returns: Radar station information and data availability

6. **Tropical Cyclones API:** Hurricane tracking (LIVE)
   - `https://api.weather.gov/products/types/TCM/locations/{location}`
   - Returns: Tropical cyclone marine forecasts, storm positions
   - Update frequency: Every 3-6 hours during active storms

7. **Zones API:** Get forecast zones
   - `https://api.weather.gov/zones/{type}/{zoneId}/forecast`
   - Types: county, fire, forecast, marine
   - Returns: Zone-specific forecasts and alerts

**Tools:**
- `get_forecast(latitude, longitude, period)` - Get forecast for location
- `get_alerts(state, severity, zone)` - Get active weather alerts (real-time)
- `get_current_conditions(station_id)` - Current observations (live data)
- `get_hourly_forecast(latitude, longitude)` - Hourly forecast for next 48 hours
- `get_hurricane_track(storm_id)` - Hurricane path and intensity (live updates)
- `get_radar_data(station_id)` - Radar station data
- `get_zone_forecast(zone_id, zone_type)` - Zone-specific forecasts
- `parse_nws_response(response)` - Parse NWS API responses
- `poll_live_alerts(location, interval)` - Continuous monitoring of alerts

**Example API Calls (Live Weather Data):**

```python
# Get 7-day forecast for Miami
forecast = get_forecast(25.7617, -80.1918, "7day")

# Get LIVE active hurricane warnings for Florida (real-time)
alerts = get_alerts(state="FL", severity="Extreme")

# Get LIVE current conditions from Miami International Airport
conditions = get_current_conditions(station_id="KMIA")

# Get hourly forecast for next 48 hours (live updates)
hourly = get_hourly_forecast(25.7617, -80.1918)

# Get LIVE hurricane tracking data
hurricane = get_hurricane_track(storm_id="AL092024")

# Poll for real-time alerts every 60 seconds
live_alerts = poll_live_alerts(location="Miami, FL", interval=60)

# Get zone-specific forecast
zone_forecast = get_zone_forecast(zone_id="FLZ173", zone_type="forecast")
```

**Live Data Integration Features:**

1. **Real-time Alert Monitoring:**
   - Continuous polling of NWS alerts API
   - Immediate notification of new warnings/watches
   - Alert severity classification (Extreme, Severe, Moderate, Minor)
   - Geographic filtering by state, county, or point

2. **Live Observation Data:**
   - Current temperature, humidity, wind speed/direction
   - Barometric pressure trends
   - Visibility and weather conditions
   - Updated every 5-60 minutes from weather stations

3. **Hurricane Tracking (Live):**
   - Real-time storm position and movement
   - Intensity updates (category, wind speed)
   - Projected path (cone of uncertainty)
   - Landfall predictions
   - Updated every 3-6 hours during active storms

4. **Hourly Forecast Updates:**
   - Next 48-hour detailed forecast
   - Temperature, precipitation probability
   - Wind conditions
   - Updated every 1-3 hours

5. **Data Freshness Indicators:**
   - Timestamp of last API update
   - Data staleness warnings
   - Automatic refresh triggers

**Response Format (Live Data):**
```json
{
  "location": "Miami, FL",
  "timestamp": "2024-10-16T14:30:00Z",
  "data_freshness": "Live - Updated 2 minutes ago",
  "current": {
    "temperature": 85,
    "humidity": 72,
    "conditions": "Partly Cloudy",
    "wind": "E 10 mph",
    "pressure": 29.92,
    "visibility": 10,
    "dewpoint": 75,
    "last_updated": "2024-10-16T14:28:00Z"
  },
  "forecast": [
    {
      "period": "Tonight",
      "temperature": 78,
      "shortForecast": "Partly Cloudy",
      "detailedForecast": "...",
      "precipitation_probability": 20,
      "wind": "E 8 mph"
    }
  ],
  "hourly_forecast": [
    {
      "time": "2024-10-16T15:00:00Z",
      "temperature": 86,
      "precipitation_probability": 15,
      "wind_speed": 10,
      "wind_direction": "E"
    }
  ],
  "alerts": [
    {
      "event": "Hurricane Warning",
      "severity": "Extreme",
      "urgency": "Immediate",
      "onset": "2024-10-16T18:00:00Z",
      "expires": "2024-10-17T06:00:00Z",
      "description": "...",
      "affected_zones": ["FLZ173", "FLZ174"],
      "instruction": "Evacuate immediately if in low-lying areas"
    }
  ],
  "hurricane_data": {
    "storm_id": "AL092024",
    "name": "Hurricane Milton",
    "category": 3,
    "max_wind": 115,
    "current_position": {"lat": 24.5, "lon": -81.2},
    "movement": "NNE at 12 mph",
    "projected_path": [...],
    "last_updated": "2024-10-16T14:00:00Z"
  }
}
```

**API Rate Limits & Best Practices:**
- No authentication required for NWS API
- Rate limit: ~5 requests per second per IP
- Use appropriate User-Agent header: `(AppName, contact@email.com)`
- Cache responses appropriately (1-5 minutes for live data)
- Handle 503 errors gracefully (API occasionally overloaded during severe weather)
- Respect `Cache-Control` headers in responses

**State Management:**
- Writes to `state['forecast_data']` - Forecast information
- Writes to `state['alerts']` - Active weather alerts
- Writes to `state['current_conditions']` - Current weather

---

## Analysis Workflows

**Previous section consolidated into Correlation Insights Agent above.**

### Data Correlation Examples

**Key Capabilities:**
- Data correlation and analysis
- Risk assessment and scoring
- Vulnerability identification
- Resource allocation recommendations
- Comparative analysis (current vs. historical)
- Impact prediction based on historical patterns
- Prioritization algorithms

**Analysis Workflows:**

**1. Hurricane Evacuation Priority:**
```python
# Inputs from other agents
hurricane_path = state['forecast_data']['hurricane_track']
census_tracts = state['query_results']['census_data']
flood_history = state['historical_data']['flood_zones']

# Risk scoring algorithm
for tract in census_tracts:
    risk_score = (
        tract['elderly_percentage'] * 0.3 +
        tract['flood_history_severity'] * 0.4 +
        tract['in_hurricane_path'] * 0.3
    )
    tract['evacuation_priority'] = risk_score

# Sort and prioritize
priority_list = sorted(census_tracts, key=lambda x: x['evacuation_priority'], reverse=True)

# Generate recommendations
recommendations = generate_evacuation_plan(priority_list)
```

**2. Heat Wave Comparison:**
```python
# Inputs
current_forecast = state['forecast_data']['heat_forecast']
historical_worst = state['historical_data']['worst_heat_wave']
vulnerable_areas = state['demographic_data']['vulnerable_populations']

# Comparison analysis
severity_ratio = current_forecast['max_heat_index'] / historical_worst['max_heat_index']
duration_ratio = current_forecast['days_over_100'] / historical_worst['days_over_100']

# Impact prediction
predicted_impact = calculate_impact(
    severity_ratio,
    duration_ratio,
    vulnerable_areas,
    historical_worst['hospitalizations']
)

# Cooling center recommendations
cooling_centers = optimize_cooling_center_placement(
    vulnerable_areas,
    predicted_impact,
    existing_facilities
)
```

**Tools:**
- `correlate_data(forecast, historical, demographic)` - Main correlation engine
- `calculate_risk_score(factors, weights)` - Risk scoring algorithm
- `identify_vulnerabilities(data)` - Vulnerability analysis
- `generate_recommendations(analysis)` - Recommendation engine
- `prioritize_resources(needs, constraints)` - Resource optimization
- `create_visualizations(data)` - Generate charts/maps

**Output Format:**
```json
{
  "analysis_summary": "Hurricane Category 3 approaching Miami-Dade County...",
  "risk_assessment": {
    "overall_risk": "Extreme",
    "affected_population": 125000,
    "high_priority_tracts": 15
  },
  "priority_list": [
    {
      "census_tract": "12086001100",
      "risk_score": 9.2,
      "population": 8500,
      "elderly_percentage": 35,
      "flood_history": "Major flooding in 2017, 2020",
      "evacuation_priority": "Immediate",
      "special_needs": "Medical transport required for 850 residents"
    }
  ],
  "recommendations": [
    "Deploy medical transport to census tract 12086001100 within 6 hours",
    "Open emergency shelter at Miami Beach Convention Center (capacity 5000)",
    "Pre-position ambulances in high-risk areas"
  ],
  "resource_allocation": {
    "medical_transport": 25,
    "emergency_shelters": 8,
    "first_responders": 150
  }
}
```

**State Management:**
- Reads `state['forecast_data']`, `state['query_results']`, `state['historical_data']`
- Writes to `state['insights']` - Analysis results
- Writes to `state['recommendations']` - Actionable recommendations

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Query                            │
│  "Hurricane approaching - which areas need evacuation?"      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Root Agent                                │
│  - Parse query intent                                        │
│  - Identify required data: forecast + demographics + history │
│  - Route to specialist agents                                │
└──────────────┬────────────────────────┬─────────────────────┘
               │                        │
               ▼                        ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Forecast Agent         │  │   Data Agent             │
│  - Call NWS API          │  │  - Query BigQuery        │
│  - Get hurricane path    │  │  - Census demographics   │
│  - Get severity/timing   │  │  - Flood history         │
│  - Get alerts            │  │  - Geographic data       │
└──────────────┬───────────┘  └──────────┬───────────────┘
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
               ┌────────────────────────────┐
               │    Insights Agent          │
               │  - Correlate forecast +    │
               │    demographics + history  │
               │  - Calculate risk scores   │
               │  - Prioritize tracts       │
               │  - Generate recommendations│
               └────────────┬───────────────┘
                            │
                            ▼
               ┌────────────────────────────┐
               │    Root Agent              │
               │  - Format response         │
               │  - Present to user         │
               └────────────────────────────┘
```

---

## State Management

The system uses `tool_context.state` as a shared data store:

| State Key | Type | Description | Written By |
|-----------|------|-------------|------------|
| `forecast_data` | dict | Weather forecast information | Forecast Agent |
| `alerts` | list | Active weather alerts | Forecast Agent |
| `current_conditions` | dict | Current weather observations | Forecast Agent |
| `query_results` | dict | Raw BigQuery results | Data Agent |
| `demographic_data` | dict | Processed demographic info | Data Agent |
| `historical_data` | dict | Historical weather/disaster data | Data Agent |
| `insights` | dict | Correlation analysis results | Insights Agent |
| `recommendations` | list | Actionable recommendations | Insights Agent |
| `user_location` | dict | User's area of interest | Root Agent |

---

## Technical Stack

### Core Technologies
- **Framework:** Google ADK (Agent Development Kit)
- **LLM:** Gemini 2.5 Flash
- **Data Platform:** Google BigQuery
- **Weather API:** National Weather Service (NWS) API
- **Cloud Platform:** Google Cloud Platform

### Python Libraries
```
google-adk>=1.10.0
google-cloud-bigquery>=3.10.0
requests>=2.31.0
python-dotenv>=1.0.0
google-auth>=2.0.0
```

### External APIs
1. **NWS API:** https://api.weather.gov (free, no API key required)
2. **Google Maps API:** Geocoding, Directions, Places, Maps JavaScript API (requires API key)
3. **BigQuery Public Datasets:** NOAA GSOD, GHCN-D, GHCN-M, Census ACS (requires GCP project)

---

## Environment Configuration

Required in `.env` file:

```bash
# Google Cloud Configuration
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=graph-rag-app-20250811
GOOGLE_CLOUD_LOCATION=us-central1

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your-maps-api-key

# Model Configuration
MODEL=gemini-2.5-flash

# GCS Bucket for secure data storage
GREEN_AGENT_BUCKET=green-agent-data
```

---

## Deployment

### Local Development
```bash
cd weather_insights_and_forecast_advisor
pip install -r requirements.txt
adk web  # Start ADK web interface at http://localhost:8000
```

### Cloud Deployment
```bash
# Deploy to Google Cloud Run
./deploy_to_cloud_run.sh

# Prerequisites:
# - Enable BigQuery API
# - Enable Cloud Run API
# - Enable Maps JavaScript API, Geocoding API, Directions API, Places API
# - Configure service account with BigQuery permissions
# - Set GOOGLE_MAPS_API_KEY in environment
```

---

## Example Queries and Expected Outputs

### Query 1: Hurricane Evacuation Priority

**Input:**
```
"We have a Category 3 hurricane approaching Miami. Which census tracts in the predicted path have a history of major flooding and high elderly populations, requiring immediate evacuation priority?"
```

**Output:**
```
HURRICANE EVACUATION PRIORITY ANALYSIS
Hurricane: Category 3, approaching from southeast
Expected landfall: 18 hours
Affected area: Miami-Dade County

HIGH PRIORITY EVACUATION ZONES (Top 5):

1. Census Tract 12086001100 (Miami Beach - South)
   - Population: 8,500
   - Elderly (65+): 35% (2,975 residents)
   - Flood History: Major flooding in 2017 (Hurricane Irma), 2020
   - Risk Score: 9.2/10
   - Action: IMMEDIATE evacuation required
   - Special Needs: 850 residents require medical transport

2. Census Tract 12086002300 (Key Biscayne)
   - Population: 6,200
   - Elderly (65+): 42% (2,604 residents)
   - Flood History: Severe flooding in 2017, 2019
   - Risk Score: 9.0/10
   - Action: IMMEDIATE evacuation required
   - Special Needs: Island location, limited evacuation routes

[... continues for top 5 tracts ...]

RESOURCE ALLOCATION RECOMMENDATIONS:
- Deploy 25 medical transport vehicles to high-priority zones
- Open 8 emergency shelters (total capacity: 35,000)
- Pre-position 150 first responders in staging areas
- Establish evacuation routes avoiding flood-prone areas

TIMELINE:
- 0-6 hours: Evacuate high-priority zones (tracts 1-5)
- 6-12 hours: Evacuate medium-priority zones (tracts 6-15)
- 12-18 hours: Complete all evacuations before landfall
```

### Query 2: Heat Wave Analysis

**Input:**
```
"Show me the 48-hour severe heat risk for Phoenix compared to the duration and intensity of the worst heat wave on record to help us stage cooling centers."
```

**Output:**
```
HEAT WAVE ANALYSIS - Phoenix, AZ

CURRENT FORECAST (Next 48 hours):
- Max Temperature: 118°F
- Max Heat Index: 122°F
- Duration: 2 days above 115°F
- Overnight Low: 95°F (no relief)

HISTORICAL WORST HEAT WAVE (June 2021):
- Max Temperature: 121°F
- Max Heat Index: 126°F
- Duration: 5 days above 115°F
- Overnight Low: 97°F

SEVERITY COMPARISON:
- Temperature: 97% of historical worst (118°F vs 121°F)
- Heat Index: 97% of historical worst
- Duration: 40% of historical worst (2 days vs 5 days)
- Overall Assessment: SEVERE but shorter than worst-case

VULNERABLE POPULATIONS AT RISK:
- Elderly (65+): 285,000 residents (18% of population)
- Low-income households without AC: 45,000 households
- Homeless population: 7,500 individuals
- High-risk neighborhoods: 12 census tracts identified

HISTORICAL IMPACT (2021 Heat Wave):
- Heat-related hospitalizations: 425
- Heat-related deaths: 12
- Emergency calls: 1,200+

PREDICTED IMPACT (Current Event):
- Expected hospitalizations: 170 (40% of 2021 levels)
- High-risk individuals: 95,000
- Peak demand: 2:00 PM - 8:00 PM

COOLING CENTER RECOMMENDATIONS:

Priority Locations (Based on Vulnerable Population Density):
1. Phoenix Convention Center (Downtown)
   - Capacity: 2,000
   - Serves: 15,000 vulnerable residents within 2 miles
   - Hours: 24/7 operation recommended

2. Maryvale Community Center (West Phoenix)
   - Capacity: 800
   - Serves: 12,000 vulnerable residents
   - High concentration of low-income, elderly

[... continues for top 8 locations ...]

RESOURCE STAGING:
- Water: 50,000 bottles pre-positioned
- Medical staff: 25 EMTs on standby
- Transportation: 15 shuttle buses for mobility-impaired
- Outreach teams: 40 teams for homeless population

TIMELINE:
- Hour 0-6: Open priority cooling centers (locations 1-4)
- Hour 6-12: Full activation of all 8 centers
- Hour 12-48: Continuous operation with shift rotations
```

---

## Success Metrics

- **Response Time:** < 30 seconds for complex multi-agent queries
- **Data Accuracy:** 95%+ accuracy in risk assessments
- **User Satisfaction:** Emergency managers find insights actionable
- **Impact:** Measurable improvement in evacuation efficiency
- **Scalability:** Handle 1000+ concurrent queries during emergencies

---

## Recent Updates

### Version 2.0 (Current)
- ✅ Added Google Maps API integration (geocoding, directions, places, maps)
- ✅ Implemented two-tier risk analysis (simple vs complex events)
- ✅ Integrated NOAA weather datasets (GSOD, GHCN-D, GHCN-M)
- ✅ Fixed forecast presentation to group day/night periods
- ✅ Removed repetitive confirmation prompts
- ✅ Added map generation with Google Maps URLs
- ✅ Dynamic project ID configuration from environment variables

## Future Enhancements

1. **Phase 3:** Integration with FEMA disaster response systems
2. **Phase 4:** Machine learning for predictive risk modeling
3. **Phase 5:** Real-time sensor data integration (IoT weather stations)
4. **Phase 6:** Mobile app for field responders
5. **Phase 7:** Multi-hazard support (wildfires, earthquakes, floods)
6. **Phase 8:** Interactive map embedding in chat interface

---

**Built for Agents for Impact '25 - Climate & Public Safety Track**
