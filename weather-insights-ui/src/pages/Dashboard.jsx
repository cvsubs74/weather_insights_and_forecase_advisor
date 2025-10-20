import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import AlertCard from '../components/AlertCard';
import MapEmbed from '../components/MapEmbed';
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
  const [agentResponse, setAgentResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('all US states');
  const [selectedFilter, setSelectedFilter] = useState('national');

  useEffect(() => {
    // Load national alerts by default
    setLocation('all US states');
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlerts = async () => {
    if (loading) return; // Prevent duplicate calls
    
    setLoading(true);
    try {
      const response = await api.getAlerts(location);
      if (response && response.content) {
        setAgentResponse(response.content);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
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
        {/* Weather Context Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📍 {location}</h2>
          <MapEmbed 
            mapUrl={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} 
            height="400px" 
          />
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> Use the filters above to view alerts by region, state, or custom location.
              For emergency resources, use <strong>Emergency Resources</strong> to find shelters or hospitals.
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
