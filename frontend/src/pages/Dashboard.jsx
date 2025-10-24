import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LocationMap from '../components/LocationMap';
import RiskAnalysisModal from '../components/RiskAnalysisModal';
import SevereWeatherCard from '../components/SevereWeatherCard';
import api from '../services/api';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  MapIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('dashboardAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [agentResponse, setAgentResponse] = useState(() => {
    return localStorage.getItem('dashboardResponse') || '';
  });
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('dashboardLocation') || '';
  });
  const [selectedFilter, setSelectedFilter] = useState(() => {
    return localStorage.getItem('dashboardFilter') || '';
  });
  const [alertMarkers, setAlertMarkers] = useState(() => {
    const saved = localStorage.getItem('dashboardMarkers');
    return saved ? JSON.parse(saved) : [];
  });
  const [mapCenter, setMapCenter] = useState(() => {
    const saved = localStorage.getItem('dashboardMapCenter');
    return saved ? JSON.parse(saved) : [39.8283, -98.5795];
  });
  const [severeEvents, setSevereEvents] = useState(() => {
    const saved = localStorage.getItem('dashboardSevereEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const eventsPerPage = 3;

  // State for Risk Analysis Modal
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [selectedAlertForAnalysis, setSelectedAlertForAnalysis] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (agentResponse) localStorage.setItem('dashboardResponse', agentResponse);
  }, [agentResponse]);

  useEffect(() => {
    if (location) localStorage.setItem('dashboardLocation', location);
  }, [location]);

  useEffect(() => {
    localStorage.setItem('dashboardFilter', selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    if (alertMarkers.length > 0) localStorage.setItem('dashboardMarkers', JSON.stringify(alertMarkers));
  }, [alertMarkers]);

  useEffect(() => {
    if (mapCenter) localStorage.setItem('dashboardMapCenter', JSON.stringify(mapCenter));
  }, [mapCenter]);

  useEffect(() => {
    if (severeEvents.length > 0) localStorage.setItem('dashboardSevereEvents', JSON.stringify(severeEvents));
  }, [severeEvents]);

  useEffect(() => {
    if (alerts.length > 0) localStorage.setItem('dashboardAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    // Don't auto-load alerts on mount - wait for user selection
    // Load severe weather events on mount only if not in localStorage
    const savedEvents = localStorage.getItem('dashboardSevereEvents');
    if (!savedEvents || savedEvents === '[]') {
      loadSevereWeatherEvents();
    }
    
    // Listen for session expiration events
    const handleSessionExpired = () => {
      console.log('[Dashboard] Session expired, clearing state');
      // Clear all dashboard state
      setAgentResponse('');
      setLocation('');
      setSelectedFilter('');
      setAlertMarkers([]);
      setMapCenter([39.8283, -98.5795]);
      setSevereEvents([]);
      localStorage.removeItem('dashboardSevereEvents');
      // Reload severe weather events only
      loadSevereWeatherEvents();
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeRisk = async (alert) => {
    setSelectedAlertForAnalysis(alert);
    setIsRiskModalOpen(true);
    setIsAnalyzingRisk(true);
    setRiskAnalysis(null); // Clear previous analysis
    try {
      const response = await api.analyzeRisk(alert);
      setRiskAnalysis(response);
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      setRiskAnalysis({ error: 'Failed to analyze risk. Please try again.' }); // Set an error state
    } finally {
      setIsAnalyzingRisk(false);
    }
  };

  const loadAlerts = async (currentLocation) => {
    if (loading) return;
    setLoading(true);
    setAlerts([]);
    setAgentResponse('');
    try {
      const response = await api.getAlerts(currentLocation);
      if (response && response.alerts && Array.isArray(response.alerts)) {
        setAlerts(response.alerts);
        if (response.alerts.length > 0) {
          setAgentResponse(`Found ${response.alerts.length} alerts for ${currentLocation}.`);
          if (response.map_data) {
            setMapCenter(response.map_data.center);
            setAlertMarkers(response.map_data.markers);
          }
        } else {
          setAgentResponse(`No active alerts found for ${currentLocation}.`);
          setAlertMarkers([]); // Clear markers when no alerts are found
        }
      } else {
        setAgentResponse(response?.content || `No active alerts found for ${currentLocation}.`);
        if (response.map_data) {
          setMapCenter(response.map_data.center);
          setAlertMarkers(response.map_data.markers);
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSevereWeatherEvents = async () => {
    if (loadingEvents) return;
    
    setLoadingEvents(true);
    try {
      const response = await api.getSevereWeatherEvents();
      
      // Parse the response to extract severe weather events
      const events = parseSevereWeatherEvents(response);
      setSevereEvents(events);
    } catch (error) {
      console.error('Failed to load severe weather events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const parseSevereWeatherEvents = (response) => {
    const events = [];
    const seenStorms = new Set(); // Track unique storms
    
    // Parse hurricanes from response
    if (response.hurricanes?.content) {
      const hurricaneText = response.hurricanes.content.toLowerCase();
      
      // Look for hurricane/tropical storm mentions
      if (hurricaneText.includes('hurricane') || hurricaneText.includes('tropical storm')) {
        // Extract storm names and details (simplified parsing)
        const lines = response.hurricanes.content.split('\n');
        
        for (const line of lines) {
          // Skip lines that are just about hurricane path/visualization
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('hurricane path') || 
              lowerLine.includes('view hurricane') ||
              lowerLine.includes('visualization') ||
              lowerLine.includes('view in google earth') ||
              lowerLine.includes('download kmz') ||
              lowerLine.includes('how to view') ||
              lowerLine.includes('forecast cone') ||
              lowerLine.includes('track path') ||
              line.trim().startsWith('**View') ||
              line.trim().startsWith('**Download') ||
              line.trim().startsWith('**How to')) {
            continue;
          }
          
          if (line.includes('Hurricane') || line.includes('Tropical Storm')) {
            const nameMatch = line.match(/(Hurricane|Tropical Storm)\s+(\w+)/i);
            if (nameMatch) {
              const stormName = nameMatch[2];
              
              // Skip if we've already seen this storm
              if (seenStorms.has(stormName)) {
                continue;
              }
              seenStorms.add(stormName);
              
              // Extract a shorter description (first sentence or up to 100 chars)
              const fullDesc = line.trim();
              const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
              
              const currentStorm = {
                type: 'hurricane',
                name: `${nameMatch[1]} ${nameMatch[2]}`,
                location: 'Atlantic/Pacific',
                severity: line.toLowerCase().includes('hurricane') ? 'Extreme' : 'Severe',
                description: shortDesc,
                fullDescription: fullDesc,
                details: {},
                trackUrl: 'https://www.nhc.noaa.gov/',
                advisoryUrl: 'https://www.nhc.noaa.gov/',
                lastUpdate: new Date().toISOString()
              };
              
              // Extract wind speed if present
              const windMatch = line.match(/(\d+)\s*mph/i);
              if (windMatch) {
                currentStorm.details.windSpeed = `${windMatch[1]} mph`;
              }
              
              events.push(currentStorm);
            }
          }
        }
      }
    }
    
    // Parse severe alerts from response
    if (response.alerts?.content) {
      const alertText = response.alerts.content;
      const lines = alertText.split('\n');
      
      for (const line of lines) {
        // Look for heat wave mentions
        if (line.toLowerCase().includes('heat') && line.toLowerCase().includes('warning')) {
          const fullDesc = line.trim();
          const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
          events.push({
            type: 'heat',
            name: 'Heat Wave',
            location: extractLocation(line) || 'Multiple States',
            severity: 'Severe',
            description: shortDesc,
            fullDescription: fullDesc,
            details: {},
            lastUpdate: new Date().toISOString()
          });
        }
        
        // Look for flood mentions
        if (line.toLowerCase().includes('flood') && line.toLowerCase().includes('warning')) {
          const fullDesc = line.trim();
          const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
          events.push({
            type: 'flood',
            name: 'Flood Warning',
            location: extractLocation(line) || 'Multiple Areas',
            severity: 'Severe',
            description: shortDesc,
            fullDescription: fullDesc,
            details: {},
            lastUpdate: new Date().toISOString()
          });
        }
      }
    }
    
    // Limit to top 6 most severe events
    return events.slice(0, 6);
  };

  const extractLocation = (text) => {
    // Simple location extraction - look for state names
    const states = ['California', 'Texas', 'Florida', 'New York', 'Arizona', 'Nevada', 'Louisiana'];
    for (const state of states) {
      if (text.includes(state)) {
        return state;
      }
    }
    return null;
  };


  const handleFilterChange = (filterType, value) => {
    let displayName = value;
    if (filterType === 'region') {
      const region = regions.find(r => r.value === value);
      displayName = region?.displayName || value;
    }
    setSelectedFilter(filterType);
    setLocation(displayName);
    loadAlerts(displayName);
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (location.trim()) {
      setSelectedFilter('custom');
      loadAlerts(location);
    }
  };

  const handleRefresh = () => {
    // Reset session to get fresh data
    api.resetSession();
    
    // Clear local state
    sessionStorage.removeItem('weatherAlerts');
    localStorage.removeItem('dashboardResponse');
    localStorage.removeItem('dashboardLocation');
    localStorage.removeItem('dashboardFilter');
    localStorage.removeItem('dashboardMarkers');
    localStorage.removeItem('dashboardMapCenter');
    localStorage.removeItem('dashboardSevereEvents');
    setLocation('');
    setSelectedFilter('');
    setAlertMarkers([]);
    setMapCenter([39.8283, -98.5795]);
    setSevereEvents([]);
    setAgentResponse('');
    
    // Reload severe weather events only
    loadSevereWeatherEvents();
  };

  const quickActions = [
    { name: 'Get Forecast', icon: MagnifyingGlassIcon, href: '/forecast', color: 'bg-blue-500' },
    { name: 'Chat with Agent', icon: ExclamationTriangleIcon, href: '/chat', color: 'bg-red-500' },
    { name: 'Find Shelters', icon: MapPinIcon, href: '/emergency-resources', color: 'bg-green-500' },
    { name: 'Evacuation Routes', icon: MapIcon, href: '/emergency-resources', color: 'bg-purple-500' },
    { name: 'Risk Analysis', icon: ChartBarIcon, href: '/risk-analysis', color: 'bg-orange-500' },
    { name: 'Find Hospitals', icon: BuildingOffice2Icon, href: '/emergency-resources', color: 'bg-teal-500' },
  ];

  const regions = [
    { name: 'National', value: 'all US states', displayName: 'National', icon: '🇺🇸' },
    { name: 'West', value: 'CA,OR,WA,NV,AZ,ID,MT,WY,CO,UT,NM,AK,HI', displayName: 'Western US', icon: '🏔️' },
    { name: 'Midwest', value: 'IL,IN,IA,KS,MI,MN,MO,NE,ND,OH,SD,WI', displayName: 'Midwest US', icon: '🌾' },
    { name: 'South', value: 'AL,AR,DE,FL,GA,KY,LA,MD,MS,NC,OK,SC,TN,TX,VA,WV', displayName: 'Southern US', icon: '🌴' },
    { name: 'Northeast', value: 'CT,ME,MA,NH,NJ,NY,PA,RI,VT', displayName: 'Northeast US', icon: '🍂' },
  ];

  const popularStates = [
    { name: 'California', value: 'California', icon: '☀️' },
    { name: 'Texas', value: 'Texas', icon: '⭐' },
    { name: 'Florida', value: 'Florida', icon: '🌊' },
    { name: 'New York', value: 'New York', icon: '🗽' },
    { name: 'Colorado', value: 'Colorado', icon: '⛰️' },
    { name: 'Washington', value: 'Washington', icon: '🌲' },
  ];

  return (
    <div className="space-y-6">
      <RiskAnalysisModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        analysis={riskAnalysis}
        isLoading={isAnalyzingRisk}
        alert={selectedAlertForAnalysis}
      />
      {/* Severe Weather Events Section */}
      {severeEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🌪️ Active Severe Weather Events</h2>
            <div className="flex items-center gap-3">
              {severeEvents.length > eventsPerPage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCarouselIndex(Math.max(0, carouselIndex - eventsPerPage))}
                    disabled={carouselIndex === 0}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {Math.floor(carouselIndex / eventsPerPage) + 1} / {Math.ceil(severeEvents.length / eventsPerPage)}
                  </span>
                  <button
                    onClick={() => setCarouselIndex(Math.min(severeEvents.length - eventsPerPage, carouselIndex + eventsPerPage))}
                    disabled={carouselIndex + eventsPerPage >= severeEvents.length}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                  </button>
                </div>
              )}
              <button
                onClick={loadSevereWeatherEvents}
                disabled={loadingEvents}
                className="text-sm text-primary hover:text-blue-900 font-medium disabled:opacity-50"
              >
                {loadingEvents ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {severeEvents.slice(carouselIndex, carouselIndex + eventsPerPage).map((event, index) => (
              <SevereWeatherCard key={carouselIndex + index} event={event} onAnalyzeRisk={handleAnalyzeRisk} />
            ))}
          </div>
          {severeEvents.length > eventsPerPage && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {carouselIndex + 1}-{Math.min(carouselIndex + eventsPerPage, severeEvents.length)} of {severeEvents.length} events
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🌍 View Alerts By:</h2>
        
        {/* Region Filters */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Regions</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <button
                key={region.name}
                onClick={() => handleFilterChange('region', region.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === 'region' && location === region.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{region.icon}</span>
                {region.name}
              </button>
            ))}
          </div>
        </div>

        {/* State Filters */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Popular States</p>
          <div className="flex flex-wrap gap-2">
            {popularStates.map((state) => (
              <button
                key={state.name}
                onClick={() => handleFilterChange('state', state.name)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === 'state' && location === state.name
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{state.icon}</span>
                {state.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Search */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Custom Location</p>
          <form onSubmit={handleCustomSearch} className="flex gap-3">
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setSelectedFilter('custom');
              }}
              placeholder="Enter any city, state, or zip code"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Active Alerts Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Active Alerts{location && agentResponse ? ` - ${location}` : ''}</h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 text-primary hover:text-blue-900 text-sm font-medium disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert, index) => (
              <SevereWeatherCard key={index} event={alert} onAnalyzeRisk={handleAnalyzeRisk} />
            ))}
          </div>
        ) : agentResponse ? (
          <div className="text-center py-12 text-gray-500">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">{agentResponse}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">No Location Selected</p>
            <p className="text-sm text-gray-500">Please select a region, state, or enter a custom location to view active alerts.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Context Map with Alert Markers */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📍 {location} {alertMarkers.length > 0 && `(${alertMarkers.length} Alert Zone${alertMarkers.length > 1 ? 's' : ''})`}
          </h2>
          <LocationMap 
            markers={alertMarkers}
            height="400px" 
          />
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> {alertMarkers.length > 0 ? 'Red markers show areas with active weather alerts. Click markers for location details.' : 'Use the filters above to view alerts by region, state, or custom location.'}
              {' '}For emergency resources, use <strong>Emergency Resources</strong> to find shelters or hospitals.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <div className={`${action.color} p-2 rounded-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
