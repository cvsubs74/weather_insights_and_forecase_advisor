import axios from 'axios';

// Multi-Agent API Configuration
const AGENT_PORTS = {
  alerts: 8081,
  forecast: 8082,
  risk: 8083,
  emergency: 8084,
  chat: 8090,
  hurricane: 8085
};

const SESSION_STORAGE_KEY = 'weather_agent_session_id';
const SESSION_TIMESTAMP_KEY = 'weather_agent_session_timestamp';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class WeatherAgentAPI {
  constructor() {
    const getBaseUrl = (agentName, port) => {
      const envVar = `REACT_APP_WEATHER_${agentName.toUpperCase()}_AGENT_URL`;
      const prodUrl = process.env[envVar];
      if (prodUrl) {
        console.log(`[API] Using production URL for ${agentName}: ${prodUrl}`);
        return prodUrl;
      }
      const devUrl = `http://localhost:${port}`;
      console.log(`[API] Using development URL for ${agentName}: ${devUrl}`);
      return devUrl;
    };

    this.clients = {
      alerts: axios.create({
        baseURL: getBaseUrl('alerts_snapshot', AGENT_PORTS.alerts),
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000, // 5 minutes - increased for zone coordinate processing
      }),
      forecast: axios.create({
        baseURL: getBaseUrl('forecast', AGENT_PORTS.forecast),
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }),
      risk: axios.create({
        baseURL: getBaseUrl('risk_analysis', AGENT_PORTS.risk),
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }),
      emergency: axios.create({
        baseURL: getBaseUrl('emergency_resources', AGENT_PORTS.emergency),
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }),
      chat: axios.create({
        baseURL: getBaseUrl('chat', AGENT_PORTS.chat),
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }),
      hurricane: axios.create({
        baseURL: getBaseUrl('hurricane_simulation', AGENT_PORTS.hurricane),
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000, // 5 minutes - increased for image analysis and evacuation priority calculations
      }),
    };

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

  async getOrCreateSession(agentName = 'chat') {
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
    
    // Create new session (use chat agent for session management)
    console.log('[API] Creating new session...');
    const sessionResponse = await this.clients.chat.post(`/apps/chat/users/user_001/sessions`, {
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
      console.log('[API] Sending query to chat orchestrator:', userQuery);
      
      // Get or create session
      const currentSessionId = await this.getOrCreateSession();
      
      // Use chat orchestrator
      const response = await this.clients.chat.post('/run', {
        app_name: 'chat',
        user_id: 'user_001',
        session_id: currentSessionId,
        new_message: {
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

  async queryWithImage(userQuery, imageFile) {
    try {
      console.log('[API] Sending query with image:', userQuery);
      
      // Get or create session
      const currentSessionId = await this.getOrCreateSession();
      
      // Convert image to base64
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Extract base64 data (remove data:image/...;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      
      // Determine MIME type
      const mimeType = imageFile.type || 'image/jpeg';
      
      // Use chat orchestrator with image
      const response = await this.clients.chat.post('/run', {
        app_name: 'chat',
        user_id: 'user_001',
        session_id: currentSessionId,
        new_message: {
          role: 'user',
          parts: [
            { text: userQuery },
            { 
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ],
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
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to query agent with image');
    }
  }

  async getForecast(location) {
    try {
      console.log('[API] Getting forecast for:', location);
      
      // Create session first
      const sessionResponse = await this.clients.forecast.post('/apps/forecast_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created forecast session:', sessionId);
      
      // Call forecast agent
      const response = await this.clients.forecast.post('/run', {
        app_name: 'forecast_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: `Get forecast for ${location}` }],
        },
        streaming: false,
      });

      console.log('[API] Forecast agent response:', response.data);

      // Parse ADK response
      const data = response.data;
      let forecastSummary = null;
      let text = ''; // Declare text here
      
      if (Array.isArray(data) && data.length > 0) {
        // Get the final step (formatter output)
        const finalStep = data[data.length - 1];
        text = finalStep?.content?.parts?.[0]?.text; // Assign to existing variable
        
        if (text) {
          try {
            forecastSummary = JSON.parse(text);
            console.log('[API] Parsed ForecastSummary:', forecastSummary);
          } catch (e) {
            console.error('[API] Failed to parse forecast JSON:', e);
          }
        }
      }

      // Update session timestamp
      this.updateSessionTimestamp();

      return {
        content: text, // Return the raw JSON string
        session_id: sessionId,
      };
    } catch (error) {
      console.error('[API] Error getting forecast:', error);
      // Re-throw the original error to preserve details
      throw error;
    }
  }

  async getAlerts(location) {
    try {
      console.log('[API] Getting alerts for:', location);
      
      // Create session first
      const sessionResponse = await this.clients.alerts.post('/apps/alerts_snapshot_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created alerts session:', sessionId);
      
      // Call alerts snapshot agent
      const response = await this.clients.alerts.post('/run', {
        app_name: 'alerts_snapshot_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: `Get alerts for ${location}` }],
        },
        streaming: false,
      });

      console.log('[API] Alerts agent response:', response.data);

      // Parse ADK response
      const data = response.data;
      let alertsSummary = null;
      
      if (Array.isArray(data) && data.length > 0) {
        // Get the final step (formatter output)
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            alertsSummary = JSON.parse(text);
            console.log('[API] Parsed AlertsSummary:', alertsSummary);
          } catch (e) {
            console.error('[API] Failed to parse alerts JSON:', e);
          }
        }
      }

      this.updateSessionTimestamp();

      return alertsSummary;
    } catch (error) {
      console.error('[API] Error getting alerts:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get alerts');
    }
  }


  async getEvacuationRoute(origin, destination) {
    try {
      console.log('[API] Getting evacuation route from:', origin, 'to:', destination);
      
      // Create session first
      const sessionResponse = await this.clients.emergency.post('/apps/emergency_resources_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created emergency session:', sessionId);
      
      const response = await this.clients.emergency.post('/run', {
        app_name: 'emergency_resources_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: `Find evacuation routes from ${origin} to ${destination}` }],
        },
        streaming: false,
      });

      const data = response.data;
      let resourcesSummary = null;
      
      if (Array.isArray(data) && data.length > 0) {
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            resourcesSummary = JSON.parse(text);
          } catch (e) {
            console.error('[API] Failed to parse resources JSON:', e);
          }
        }
      }

      this.updateSessionTimestamp();

      return {
        content: resourcesSummary?.insights || '',
        evacuation_routes: resourcesSummary?.evacuation_routes || [],
        session_id: sessionId,
      };
    } catch (error) {
      console.error('[API] Error getting evacuation route:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get evacuation route');
    }
  }

  async analyzeRisk(alert) {
    try {
      console.log('[API] Analyzing risk for alert:', alert.event);
      
      // Create session first
      const sessionResponse = await this.clients.risk.post('/apps/risk_analysis_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created risk session:', sessionId);
      
      // The agent expects a JSON string as input
      const alertJson = JSON.stringify(alert);

      // Call risk analysis agent
      const response = await this.clients.risk.post('/run', {
        app_name: 'risk_analysis_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: alertJson }],
        },
        streaming: false,
      });

      console.log('[API] Risk analysis agent response:', response.data);

      // Parse ADK response
      const data = response.data;
      let riskSummary = null;
      
      if (Array.isArray(data) && data.length > 0) {
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            riskSummary = JSON.parse(text);
            console.log('[API] Parsed RiskAnalysisSummary:', riskSummary);
          } catch (e) {
            console.error('[API] Failed to parse risk JSON:', e);
          }
        }
      }

      this.updateSessionTimestamp();

      // The agent now directly returns the RiskAnalysisSummary object.
      // We just need to ensure the frontend receives it correctly.
      return riskSummary;
    } catch (error) {
      console.error('[API] Error analyzing risk:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to analyze risk');
    }
  }

  async findResources(location, resourceType, radius = 10) {
    try {
      console.log(`[API] Finding ${resourceType} near:`, location);
      
      // Create session first
      const sessionResponse = await this.clients.emergency.post('/apps/emergency_resources_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created emergency session:', sessionId);
      
      const response = await this.clients.emergency.post('/run', {
        app_name: 'emergency_resources_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: `Find ${resourceType} near ${location} within ${radius} miles` }],
        },
        streaming: false,
      });

      const data = response.data;
      let resourcesSummary = null;
      
      if (Array.isArray(data) && data.length > 0) {
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            resourcesSummary = JSON.parse(text);
            console.log('[API] Parsed EmergencyResourcesSummary:', resourcesSummary);
          } catch (e) {
            console.error('[API] Failed to parse resources JSON:', e);
            return null; // Return null on parsing error
          }
        }
      }

      this.updateSessionTimestamp();

      return resourcesSummary; // Return the full object
    } catch (error) {
      console.error(`[API] Error finding ${resourceType}:`, error);
      throw new Error(error.response?.data?.message || error.message || `Failed to find ${resourceType}`);
    }
  }

  async geocode(address) {
    try {
      console.log('[API] Geocoding address:', address);
      const response = await this.clients.emergency.post('/run', {
        app_name: 'emergency_resources_agent',
        user_id: 'user_001',
        new_message: { parts: [{ text: `Geocode: ${address}` }] },
        streaming: false,
      });

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        if (text) {
          return JSON.parse(text);
        }
      }
      return null;
    } catch (error) {
      console.error('[API] Error geocoding address:', error);
      return null;
    }
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

  async getSuggestedActions(lastUserQuery, lastAgentResponse) {
    try {
      console.log('[API] Getting suggested actions...');
      
      const prompt = `Based on this conversation:\nUser: ${lastUserQuery}\nAssistant: ${lastAgentResponse.substring(0, 500)}...\n\nGenerate exactly 4 contextual follow-up questions the user might want to ask next. \n- Make them specific and actionable\n- Include the same location/context from the conversation\n- Format as a simple list, one per line\n- No numbering, bullets, or extra text\n- Each should be a complete, ready-to-send question\n\nExample format:\nShow me the hourly forecast for Miami\nAre there any weather alerts in Miami?\nFind emergency shelters near Miami\nWhat's the extended forecast for Miami?`;

      const response = await this.query(prompt);
      
      if (response && response.content) {
        // Parse the response into an array of suggestions
        const suggestions = response.content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.match(/^(here|based|example|format)/i))
          .slice(0, 4);
        
        console.log('[API] Generated suggestions:', suggestions);
        return suggestions;
      }
      
      return [];
    } catch (error) {
      console.error('[API] Error getting suggested actions:', error);
      return [];
    }
  }

  async analyzeHurricaneImage(imageFile) {
    try {
      console.log('[API] Analyzing hurricane image...');
      
      // Create session first
      const sessionResponse = await this.clients.hurricane.post('/apps/hurricane_simulation_agent/users/user_001/sessions', {
        state: {}
      });
      const sessionId = sessionResponse.data.id;
      console.log('[API] Created hurricane session:', sessionId);
      
      // Convert image to base64
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Extract base64 data (remove data:image/...;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      
      // Determine MIME type
      const mimeType = imageFile.type || 'image/jpeg';
      
      // Call hurricane simulation agent with image
      const response = await this.clients.hurricane.post('/run', {
        app_name: 'hurricane_simulation_agent',
        user_id: 'user_001',
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [
            { text: 'Analyze this hurricane image and provide evacuation priorities' },
            { 
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ],
        },
        streaming: false,
      });

      console.log('[API] Hurricane analysis response:', response.data);

      // Parse ADK response
      const data = response.data;
      let evacuationPlan = null;
      
      if (Array.isArray(data) && data.length > 0) {
        // Get the final step (evacuation plan output)
        const finalStep = data[data.length - 1];
        const text = finalStep?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            evacuationPlan = JSON.parse(text);
            console.log('[API] Parsed EvacuationPlan:', evacuationPlan);
          } catch (e) {
            console.error('[API] Failed to parse evacuation plan JSON:', e);
            // Return raw text if JSON parsing fails
            evacuationPlan = { raw_response: text };
          }
        }
      }

      this.updateSessionTimestamp();

      return evacuationPlan;
    } catch (error) {
      console.error('[API] Error analyzing hurricane image:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to analyze hurricane image');
    }
  }
}

const apiInstance = new WeatherAgentAPI();
export default apiInstance;