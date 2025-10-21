import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import AlertCard from '../components/AlertCard';
import LocationMap from '../components/LocationMap';
import api from '../services/api';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  MapIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [agentResponse, setAgentResponse] = useState(() => {
    return localStorage.getItem('dashboardResponse') || '';
  });
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('dashboardLocation') || 'all US states';
  });
  const [selectedFilter, setSelectedFilter] = useState(() => {
    return localStorage.getItem('dashboardFilter') || 'national';
  });
  const [alertMarkers, setAlertMarkers] = useState(() => {
    const saved = localStorage.getItem('dashboardMarkers');
    return saved ? JSON.parse(saved) : [];
  });
  const [mapCenter, setMapCenter] = useState(() => {
    const saved = localStorage.getItem('dashboardMapCenter');
    return saved ? JSON.parse(saved) : [39.8283, -98.5795];
  });

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
    // Only load alerts if there's no saved response
    if (!agentResponse) {
      loadAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlerts = async () => {
    if (loading) return; // Prevent duplicate calls
    
    setLoading(true);
    try {
      const response = await api.getAlerts(location);
      if (response && response.content) {
        setAgentResponse(response.content);
        parseAlertLocations(response.content, location);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseAlertLocations = (content, currentLocation) => {
    const markers = [];
    
    // Regional centers for broad queries
    const regionalCenters = {
      'all US states': [39.8283, -98.5795],
      'western US states': [40.0, -115.0],
      'midwest US states': [41.5, -93.5],
      'southern US states': [32.0, -90.0],
      'northeast US states': [42.5, -73.5]
    };
    
    // Location database for US states and major cities
    const locationMap = {
      // California
      'San Francisco': [37.7749, -122.4194],
      'Los Angeles': [34.0522, -118.2437],
      'San Diego': [32.7157, -117.1611],
      'Sacramento': [38.5816, -121.4944],
      'Eureka': [40.8021, -124.1637],
      'Monterey': [36.6002, -121.8947],
      'Santa Barbara': [34.4208, -119.6982],
      'San Luis Obispo': [35.2828, -120.6596],
      'Mendocino': [39.3077, -123.7994],
      'Del Norte': [41.7443, -124.1337],
      'Humboldt': [40.7450, -123.8695],
      'California': [36.7783, -119.4179],
      // Texas
      'Houston': [29.7604, -95.3698],
      'Dallas': [32.7767, -96.7970],
      'Austin': [30.2672, -97.7431],
      'San Antonio': [29.4241, -98.4936],
      'Texas': [31.9686, -99.9018],
      // Florida
      'Miami': [25.7617, -80.1918],
      'Tampa': [27.9506, -82.4572],
      'Orlando': [28.5383, -81.3792],
      'Jacksonville': [30.3322, -81.6557],
      'Florida': [27.6648, -81.5158],
      // New York
      'New York': [40.7128, -74.0060],
      'Buffalo': [42.8864, -78.8784],
      'Albany': [42.6526, -73.7562],
      // Other major cities
      'Chicago': [41.8781, -87.6298],
      'Seattle': [47.6062, -122.3321],
      'Denver': [39.7392, -104.9903],
      'Phoenix': [33.4484, -112.0740],
      'Atlanta': [33.7490, -84.3880],
      'Boston': [42.3601, -71.0589],
      'Washington': [38.9072, -77.0369],
      'Portland': [45.5152, -122.6784],
      'Las Vegas': [36.1699, -115.1398],
      'New Orleans': [29.9511, -90.0715]
    };
    
    // Search for location names in the response
    Object.entries(locationMap).forEach(([name, coords]) => {
      if (content.toLowerCase().includes(name.toLowerCase())) {
        markers.push({
          lat: coords[0],
          lng: coords[1],
          title: name,
          address: 'Alert Zone'
        });
      }
    });
    
    // Remove duplicates
    const uniqueMarkers = markers.filter((marker, index, self) =>
      index === self.findIndex((m) => m.lat === marker.lat && m.lng === marker.lng)
    );
    
    setAlertMarkers(uniqueMarkers);
    
    // Set map center based on markers or regional center
    if (uniqueMarkers.length > 0) {
      // Calculate center from markers
      const avgLat = uniqueMarkers.reduce((sum, m) => sum + m.lat, 0) / uniqueMarkers.length;
      const avgLng = uniqueMarkers.reduce((sum, m) => sum + m.lng, 0) / uniqueMarkers.length;
      setMapCenter([avgLat, avgLng]);
    } else if (regionalCenters[currentLocation]) {
      // Use regional center for broad queries
      setMapCenter(regionalCenters[currentLocation]);
    } else {
      // Default to US center
      setMapCenter([39.8283, -98.5795]);
    }
  };

  const handleFilterChange = async (filterType, value) => {
    console.log('[Dashboard] Filter changed:', filterType, value);
    setSelectedFilter(filterType);
    setLocation(value);
    setLoading(true);
    
    try {
      console.log('[Dashboard] Calling api.getAlerts with:', value);
      const response = await api.getAlerts(value);
      console.log('[Dashboard] API response:', response);
      if (response && response.content) {
        setAgentResponse(response.content);
        parseAlertLocations(response.content, value);
      } else {
        console.error('[Dashboard] No content in response:', response);
        setAgentResponse('No alerts data received.');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    if (location.trim()) {
      setSelectedFilter('custom');
      loadAlerts();
    }
  };

  const handleRefresh = () => {
    sessionStorage.removeItem('weatherAlerts');
    localStorage.removeItem('dashboardResponse');
    localStorage.removeItem('dashboardLocation');
    localStorage.removeItem('dashboardFilter');
    localStorage.removeItem('dashboardMarkers');
    localStorage.removeItem('dashboardMapCenter');
    setLocation('all US states');
    setSelectedFilter('national');
    setAlertMarkers([]);
    setMapCenter([39.8283, -98.5795]);
    loadAlerts();
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
    { name: 'National', value: 'all US states', icon: '🇺🇸' },
    { name: 'West', value: 'western US states', icon: '🏔️' },
    { name: 'Midwest', value: 'midwest US states', icon: '🌾' },
    { name: 'South', value: 'southern US states', icon: '🌴' },
    { name: 'Northeast', value: 'northeast US states', icon: '🍂' },
  ];

  const popularStates = [
    { name: 'California', icon: '☀️' },
    { name: 'Texas', icon: '⭐' },
    { name: 'Florida', icon: '🌊' },
    { name: 'New York', icon: '🗽' },
    { name: 'Colorado', icon: '⛰️' },
    { name: 'Washington', icon: '🌲' },
  ];

  return (
    <div className="space-y-6">
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
              value={selectedFilter === 'custom' ? location : ''}
              onChange={(e) => setLocation(e.target.value)}
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
          <h2 className="text-2xl font-bold text-gray-900">Active Alerts - {location}</h2>
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
        ) : agentResponse ? (
          <div className="space-y-4">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-semibold text-gray-700 mb-2 mt-3" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 ml-2" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                hr: ({node, ...props}) => <hr className="my-6 border-gray-300" {...props} />,
              }}
            >
              {agentResponse}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No active alerts in your area</p>
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
            center={mapCenter}
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
