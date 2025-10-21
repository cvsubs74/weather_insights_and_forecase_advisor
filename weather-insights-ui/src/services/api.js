import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const SESSION_STORAGE_KEY = 'weather_agent_session_id';
const SESSION_TIMESTAMP_KEY = 'weather_agent_session_timestamp';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class WeatherAgentAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds for complex queries
    });

    this.sessionId = null;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isSessionValid() {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    if (!sessionId || !timestamp) {
      return false;
    }
    
    const now = Date.now();
    const sessionAge = now - parseInt(timestamp, 10);
    
    if (sessionAge > SESSION_TIMEOUT) {
      console.log('[API] Session expired, age:', sessionAge, 'ms');
      return false;
    }
    
    return true;
  }

  clearBrowserState() {
    console.log('[API] Clearing browser state due to session expiration');
    
    // Clear all localStorage except user preferences
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('dashboard') || 
                  key.startsWith('weather_agent') || 
                  key.startsWith('chat') ||
                  key.startsWith('forecast') ||
                  key.startsWith('risk') ||
                  key.startsWith('emergency'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('sessionExpired'));
  }

  // Manual session reset - for user-initiated clear
  resetSession() {
    console.log('[API] Manual session reset');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    this.clearBrowserState();
  }

  async getOrCreateSession() {
    // Check if we have a valid session
    if (this.isSessionValid()) {
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      console.log('[API] Reusing existing session:', sessionId);
      return sessionId;
    }
    
    // Session expired or doesn't exist - clear browser state
    if (localStorage.getItem(SESSION_STORAGE_KEY)) {
      this.clearBrowserState();
    }
    
    // Create new session
    console.log('[API] Creating new session...');
    const sessionResponse = await this.client.post('/apps/weather_insights_agent/users/user_001/sessions', {
      state: {}
    });
    const newSessionId = sessionResponse.data.id;
    
    // Store session ID and timestamp
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    
    console.log('[API] New session created:', newSessionId);
    return newSessionId;
  }

  updateSessionTimestamp() {
    // Update timestamp on each successful query to keep session alive
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  }

  async query(userQuery) {
    try {
      console.log('[API] Sending query:', userQuery);
      
      // Get or create session
      const currentSessionId = await this.getOrCreateSession();
      
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

      // Update session timestamp on successful query
      this.updateSessionTimestamp();

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
      
      // Check if error is due to invalid session
      if (error.response?.status === 404 || error.response?.status === 401) {
        console.log('[API] Session may be invalid, clearing browser state');
        this.clearBrowserState();
      }
      
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

  async getSevereWeatherEvents() {
    try {
      // Get active hurricanes
      const hurricanesResponse = await this.query('What are the current active hurricanes or tropical storms?');
      
      // Get severe weather alerts
      const alertsResponse = await this.query('What are the most severe weather alerts currently active in the United States?');
      
      return {
        hurricanes: hurricanesResponse,
        alerts: alertsResponse
      };
    } catch (error) {
      console.error('[API] Error fetching severe weather events:', error);
      throw error;
    }
  }
}

const apiInstance = new WeatherAgentAPI();
export default apiInstance;
