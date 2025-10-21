import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class WeatherAgentAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds for complex queries
    });

    this.sessionId = this.generateSessionId();
    this.sessionCreated = false;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async query(userQuery) {
    try {
      console.log('[API] Sending query:', userQuery);
      
      // Always create a new session for each query to avoid session issues
      console.log('[API] Creating new session...');
      const sessionResponse = await this.client.post('/apps/weather_insights_agent/users/user_001/sessions', {
        state: {}
      });
      const currentSessionId = sessionResponse.data.id;
      console.log('[API] Session created:', currentSessionId);
      
      // Use ADK API server /run endpoint
      const response = await this.client.post('/run', {
        appName: 'weather_insights_agent',
        userId: 'user_001',
        sessionId: currentSessionId,
        newMessage: {
          role: 'user',
          parts: [{ text: userQuery }],
        },
        streaming: false,
      });

      console.log('[API] Response status:', response.status);
      console.log('[API] Response data:', response.data);

      // ADK returns array of events - extract text from response
      let responseText = '';
      const data = response.data;

      if (Array.isArray(data)) {
        console.log('[API] Processing array of', data.length, 'events');
        // Iterate through events and collect text responses
        for (const event of data) {
          if (event.content?.parts) {
            for (const part of event.content.parts) {
              if (part.text) {
                responseText += part.text;
                console.log('[API] Found text:', part.text.substring(0, 100));
              }
            }
          }
        }
      } else if (data.content?.parts) {
        console.log('[API] Processing single object response');
        // Fallback for single object response
        for (const part of data.content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      }

      console.log('[API] Final response text length:', responseText.length);

      return {
        content: responseText,
        session_id: currentSessionId,
      };
    } catch (error) {
      console.error('[API] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(error.response?.data?.message || error.message || 'Failed to query agent');
    }
  }

  async getForecast(location) {
    return this.query(`Give me the 7-day forecast for ${location}`);
  }

  async getAlerts(location) {
    return this.query(`What are the current weather alerts in ${location}?`);
  }

  async findShelters(location, radius = 10) {
    return this.query(`Find the nearest emergency shelters to ${location} within ${radius} miles`);
  }

  async getEvacuationRoute(origin, destination) {
    return this.query(`Calculate the fastest evacuation route from ${origin} to ${destination} with alternatives`);
  }

  async analyzeRisk(event, location) {
    return this.query(`Perform risk analysis for ${event} in ${location}`);
  }

  async findHospitals(location, radius = 5) {
    return this.query(`Find hospitals near ${location} within ${radius} miles`);
  }

  async getHistoricalData(location, eventType) {
    return this.query(`Find historical ${eventType} events in ${location}`);
  }

  async getVulnerablePopulations(location) {
    return this.query(`Which census tracts in ${location} have high elderly populations in flood zones?`);
  }
}

const apiInstance = new WeatherAgentAPI();
export default apiInstance;
