# Weather Insights Agent - Testing Guide

## Overview

This guide explains how to invoke and test the Weather Insights and Forecast Advisor agent for all use cases defined in the UX Design Plan.

---

## Prerequisites

1. **Environment Setup:**
   ```bash
   cd weather_insights_and_forecast_advisor
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Ensure `.env` file contains:
   ```bash
   GOOGLE_GENAI_USE_VERTEXAI=TRUE
   GOOGLE_CLOUD_PROJECT=graph-rag-app-20250811
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_MAPS_API_KEY=your-maps-api-key
   MODEL=gemini-2.5-flash
   ```

---

## Agent Invocation Pattern

The agent follows the ADK standard invocation pattern:

```python
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from agent import root_agent

# Create runner
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    session_service=session_service
)

# Invoke agent
response = await runner.run_async(
    user_content="Your query here",
    session_id="session_001"
)

print(response.content)
```

**Key Points:**
- The agent must export `root_agent` variable (already configured)
- Use `Runner` class to invoke the agent
- Session service maintains conversation state
- Responses are asynchronous

---

## Testing Methods

### Method 1: ADK Web Interface (Recommended for Development)

```bash
adk web
```

Then open http://localhost:8000 and test queries interactively.

**Advantages:**
- Visual interface with chat history
- Real-time debugging
- Trace viewer for agent execution
- Easy to iterate and refine

### Method 2: Automated Test Script

Run the comprehensive test suite:

```bash
python test_use_cases.py
```

This script tests all 15 use cases from the UX Design Plan.

**Advantages:**
- Automated regression testing
- Consistent test coverage
- Easy to run in CI/CD pipelines
- Generates test reports

### Method 3: Cloud Run Deployment

Deploy to Cloud Run and test via HTTP:

```bash
./deploy_to_cloud_run.sh
```

Then invoke via curl:

```bash
curl -X POST https://weather-insights-[hash].run.app/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Give me the 7-day forecast for Miami, FL"}'
```

---

## Test Use Cases

### 1. Real-Time Weather Intelligence

**UC1: Basic Weather Forecast**
```
Query: "Give me the 7-day forecast for Miami, FL"
Expected: 7-day forecast with high/low temps, conditions
Agent Flow: location_services_agent → nws_forecast_agent
```

**UC2: Active Weather Alerts**
```
Query: "What are the current weather alerts in California?"
Expected: List of active alerts with severity levels
Agent Flow: nws_forecast_agent (alerts API)
```

**UC11: Hourly Forecast**
```
Query: "Give me the hourly forecast for the next 48 hours in San Francisco"
Expected: Hourly temperature and precipitation data
Agent Flow: location_services_agent → nws_forecast_agent
```

### 2. Location & Navigation Services

**UC4: Emergency Shelter Search**
```
Query: "Find the nearest emergency shelters to downtown Houston within 10 miles"
Expected: List of shelters with addresses, distances, capacities
Agent Flow: location_services_agent (geocode + search_nearby_places)
```

**UC5: Evacuation Route Planning**
```
Query: "Calculate the fastest evacuation route from Tampa to Orlando with alternatives"
Expected: Multiple routes with travel times and distances
Agent Flow: location_services_agent (get_directions)
```

**UC12: Hospital Locator**
```
Query: "Find hospitals near downtown Los Angeles within 5 miles"
Expected: List of hospitals with contact info and distances
Agent Flow: location_services_agent (geocode + search_nearby_places)
```

### 3. Map Visualization

**UC6: Single Location Map**
```
Query: "Show me a map of the flood warning areas in Astor, FL"
Expected: Google Maps URL with flood warning markers
Agent Flow: location_services_agent (geocode + generate_map)
```

**UC13: Multi-Location Map**
```
Query: "Show me a map with markers for all active coastal flood warnings in California"
Expected: Map URL with multiple red markers for affected areas
Agent Flow: nws_forecast_agent (alerts) → location_services_agent (generate_map)
```

### 4. Risk Analysis

**UC7: Simple Risk Analysis (Tier 1)**
```
Query: "Any risks associated with the Rip Current Statement in Miami-Dade County?"
Expected: Immediate common-sense analysis without BigQuery
Agent Flow: nws_forecast_agent → correlation_insights_agent (simple analysis)
Validation: Should NOT call bigquery_data_agent
```

**UC8: Complex Risk Analysis (Tier 2)**
```
Query: "Compare the current heat wave forecast for Phoenix to the worst heat wave on record and recommend cooling center locations"
Expected: Data-driven analysis with historical comparison
Agent Flow: nws_forecast_agent → correlation_insights_agent → bigquery_data_agent
Validation: MUST call bigquery_data_agent for historical data
```

**UC3: Hurricane Evacuation Priority**
```
Query: "We have a Category 3 hurricane approaching Miami-Dade County. Which census tracts have high elderly populations and flood history?"
Expected: Prioritized evacuation list with risk scores
Agent Flow: nws_forecast_agent → correlation_insights_agent → bigquery_data_agent
```

### 5. Historical Data & Demographics

**UC9: Vulnerable Population Analysis**
```
Query: "Which census tracts in Houston have high elderly populations in flood zones?"
Expected: Census tract data with demographic breakdowns
Agent Flow: location_services_agent → bigquery_data_agent
```

**UC10: Historical Weather Events**
```
Query: "Find historical extreme temperature events in Del Norte County, California"
Expected: Historical temperature data from NOAA datasets
Agent Flow: location_services_agent → bigquery_data_agent (GSOD/GHCN-D)
```

**UC14: Weather Station Data**
```
Query: "Find weather stations near San Diego and show me their recent temperature data"
Expected: Weather station locations and recent observations
Agent Flow: location_services_agent → bigquery_data_agent (ghcnd_stations)
```

### 6. Emergency Response Planning

**UC15: Resource Allocation**
```
Query: "For a major flood event in New Orleans, what resources should we allocate based on historical flood impacts and current population demographics?"
Expected: Resource recommendations with quantities and timelines
Agent Flow: location_services_agent → bigquery_data_agent → correlation_insights_agent
```

---

## Validation Checklist

For each test case, verify:

### ✅ Functional Requirements
- [ ] Agent responds within 30 seconds
- [ ] Response is relevant to the query
- [ ] Data is accurate and up-to-date
- [ ] No errors or exceptions thrown

### ✅ Agent Routing
- [ ] Correct agents are invoked
- [ ] State is properly maintained between agents
- [ ] No unnecessary agent calls

### ✅ Two-Tier Risk Analysis
- [ ] Simple events (rip currents, beach hazards) → NO BigQuery
- [ ] Complex events (hurricanes, floods) → WITH BigQuery
- [ ] Risk assessments include actionable recommendations

### ✅ Data Quality
- [ ] Coordinates are accurate
- [ ] Addresses are properly formatted
- [ ] Map URLs are valid and clickable
- [ ] Historical data includes specific numbers

### ✅ User Experience
- [ ] No confirmation prompts for standard queries
- [ ] Responses are business-friendly (no technical jargon)
- [ ] Recommendations include timelines and resource counts
- [ ] Maps show correct markers and colors

---

## Common Issues & Troubleshooting

### Issue 1: Agent Not Found
```
Error: Module 'agent' has no attribute 'root_agent'
```
**Solution:** Ensure `agent.py` has `root_agent = root_agent` at the end

### Issue 2: Google Maps API Errors
```
Error: GOOGLE_MAPS_API_KEY not found
```
**Solution:** Add API key to `.env` file and restart

### Issue 3: BigQuery Permission Denied
```
Error: Permission denied on BigQuery dataset
```
**Solution:** Ensure service account has BigQuery Data Viewer role

### Issue 4: NWS API Rate Limiting
```
Error: 503 Service Unavailable
```
**Solution:** Implement retry logic with exponential backoff (already in code)

### Issue 5: Slow Response Times
```
Response takes > 30 seconds
```
**Solution:** 
- Check network connectivity
- Verify API quotas
- Consider caching forecast data

---

## Performance Benchmarks

Expected response times for each use case:

| Use Case | Expected Time | Agent Calls |
|----------|--------------|-------------|
| UC1: Basic Forecast | 3-5 seconds | 2 agents |
| UC2: Active Alerts | 2-4 seconds | 1 agent |
| UC3: Hurricane Evacuation | 15-25 seconds | 4 agents |
| UC4: Shelter Search | 4-6 seconds | 2 agents |
| UC5: Evacuation Routes | 3-5 seconds | 2 agents |
| UC6: Map Generation | 2-4 seconds | 2 agents |
| UC7: Simple Risk | 3-5 seconds | 2 agents |
| UC8: Complex Risk | 12-20 seconds | 4 agents |
| UC9: Vulnerable Pop | 8-12 seconds | 3 agents |
| UC10: Historical Data | 6-10 seconds | 3 agents |

---

## Continuous Testing

### Automated Testing Schedule

**Daily:**
- Run `test_use_cases.py` to verify all use cases
- Check for API errors or rate limiting
- Validate data freshness

**Weekly:**
- Test with real-world emergency scenarios
- Verify BigQuery dataset availability
- Update test data with recent events

**Monthly:**
- Performance benchmarking
- User acceptance testing
- Update test cases based on feedback

---

## Integration with React Frontend

When the React frontend is built, it will invoke the agent via:

### Option 1: Direct ADK Runner (Development)
```javascript
// Frontend calls backend API
const response = await fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: userQuery })
});
```

### Option 2: Cloud Run Endpoint (Production)
```javascript
const response = await fetch('https://weather-insights-[hash].run.app/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    query: userQuery,
    session_id: sessionId 
  })
});
```

---

## Next Steps

1. ✅ Agent invocation pattern configured (`root_agent` exported)
2. ✅ Test script created (`test_use_cases.py`)
3. ⏳ Run automated tests to validate all use cases
4. ⏳ Build React frontend based on UX Design Plan
5. ⏳ Integrate frontend with agent backend
6. ⏳ Deploy to production and monitor performance

---

## Resources

- **ADK Documentation:** https://google.github.io/adk-docs/
- **NWS API Docs:** https://www.weather.gov/documentation/services-web-api
- **Google Maps API:** https://developers.google.com/maps/documentation
- **BigQuery Public Datasets:** https://cloud.google.com/bigquery/public-data

---

**Last Updated:** 2025-10-18  
**Version:** 2.0
