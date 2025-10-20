#!/usr/bin/env python3
"""
Test script to invoke the Weather Insights and Forecast Advisor agent
for all use cases defined in the UX Design Plan.

This script demonstrates how to programmatically invoke the agent with
various queries to test the complete user experience.
"""

import asyncio
import os
from pathlib import Path
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Import the agent
import sys
sys.path.insert(0, str(Path(__file__).parent))
from agent import root_agent


class WeatherAgentTester:
    """Test harness for Weather Insights agent use cases"""
    
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.runner = Runner(
            agent=root_agent,
            session_service=self.session_service
        )
        self.session_id = "test_session_001"
        
    async def invoke_agent(self, query: str, test_name: str):
        """Invoke the agent with a query and print results"""
        print(f"\n{'='*80}")
        print(f"TEST: {test_name}")
        print(f"{'='*80}")
        print(f"Query: {query}")
        print(f"{'-'*80}")
        
        try:
            response = await self.runner.run_async(
                user_content=query,
                session_id=self.session_id
            )
            
            print(f"Response:\n{response.content}")
            print(f"{'='*80}\n")
            return response
            
        except Exception as e:
            print(f"ERROR: {str(e)}")
            print(f"{'='*80}\n")
            return None
    
    async def test_all_use_cases(self):
        """Run all use cases from the UX Design Plan"""
        
        print("\n" + "="*80)
        print("WEATHER INSIGHTS & FORECAST ADVISOR - USE CASE TESTING")
        print("="*80)
        
        # ===================================================================
        # USE CASE 1: Basic Weather Forecast
        # ===================================================================
        await self.invoke_agent(
            "Give me the 7-day forecast for Miami, FL",
            "UC1: Basic Weather Forecast"
        )
        
        # ===================================================================
        # USE CASE 2: Current Weather Alerts
        # ===================================================================
        await self.invoke_agent(
            "What are the current weather alerts in California?",
            "UC2: Active Weather Alerts"
        )
        
        # ===================================================================
        # USE CASE 3: Hurricane Evacuation Planning
        # ===================================================================
        await self.invoke_agent(
            "We have a Category 3 hurricane approaching Miami-Dade County. "
            "Which census tracts in the predicted path have a history of major flooding "
            "and high elderly populations, requiring immediate evacuation priority?",
            "UC3: Hurricane Evacuation Priority Analysis"
        )
        
        # ===================================================================
        # USE CASE 4: Emergency Shelter Search
        # ===================================================================
        await self.invoke_agent(
            "Find the nearest emergency shelters to downtown Houston within 10 miles",
            "UC4: Emergency Shelter Finder"
        )
        
        # ===================================================================
        # USE CASE 5: Evacuation Route Planning
        # ===================================================================
        await self.invoke_agent(
            "Calculate the fastest evacuation route from Tampa to Orlando with alternatives",
            "UC5: Evacuation Route Calculation"
        )
        
        # ===================================================================
        # USE CASE 6: Map Generation
        # ===================================================================
        await self.invoke_agent(
            "Show me a map of the flood warning areas in Astor, FL",
            "UC6: Map Generation with Markers"
        )
        
        # ===================================================================
        # USE CASE 7: Simple Risk Analysis (Rip Currents)
        # ===================================================================
        await self.invoke_agent(
            "Any risks associated with the Rip Current Statement in Miami-Dade County?",
            "UC7: Simple Risk Analysis (Rip Currents)"
        )
        
        # ===================================================================
        # USE CASE 8: Complex Risk Analysis (Heat Wave)
        # ===================================================================
        await self.invoke_agent(
            "Compare the current heat wave forecast for Phoenix to the worst heat wave "
            "on record and recommend cooling center locations",
            "UC8: Complex Risk Analysis (Heat Wave)"
        )
        
        # ===================================================================
        # USE CASE 9: Vulnerable Population Analysis
        # ===================================================================
        await self.invoke_agent(
            "Which census tracts in Houston have high elderly populations in flood zones?",
            "UC9: Vulnerable Population Identification"
        )
        
        # ===================================================================
        # USE CASE 10: Historical Weather Events
        # ===================================================================
        await self.invoke_agent(
            "Find historical extreme temperature events in Del Norte County, California",
            "UC10: Historical Weather Data Query"
        )
        
        # ===================================================================
        # USE CASE 11: Hourly Forecast
        # ===================================================================
        await self.invoke_agent(
            "Give me the hourly forecast for the next 48 hours in San Francisco",
            "UC11: Hourly Forecast"
        )
        
        # ===================================================================
        # USE CASE 12: Hospital Locator
        # ===================================================================
        await self.invoke_agent(
            "Find hospitals near downtown Los Angeles within 5 miles",
            "UC12: Hospital Locator"
        )
        
        # ===================================================================
        # USE CASE 13: Multi-Location Map
        # ===================================================================
        await self.invoke_agent(
            "Show me a map with markers for all active coastal flood warnings in California",
            "UC13: Multi-Location Map Visualization"
        )
        
        # ===================================================================
        # USE CASE 14: Weather Station Query
        # ===================================================================
        await self.invoke_agent(
            "Find weather stations near San Diego and show me their recent temperature data",
            "UC14: Weather Station Data"
        )
        
        # ===================================================================
        # USE CASE 15: Resource Allocation Planning
        # ===================================================================
        await self.invoke_agent(
            "For a major flood event in New Orleans, what resources should we allocate "
            "based on historical flood impacts and current population demographics?",
            "UC15: Resource Allocation Recommendations"
        )
        
        print("\n" + "="*80)
        print("ALL USE CASE TESTS COMPLETED")
        print("="*80 + "\n")


async def main():
    """Main entry point for testing"""
    tester = WeatherAgentTester()
    await tester.test_all_use_cases()


if __name__ == "__main__":
    # Ensure environment variables are loaded
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the tests
    asyncio.run(main())
