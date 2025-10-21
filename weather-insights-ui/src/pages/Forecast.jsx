import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const Forecast = () => {
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('forecastLocation') || '';
  });
  const [agentResponse, setAgentResponse] = useState(() => {
    return localStorage.getItem('forecastResponse') || '';
  });
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever location or response changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('forecastLocation', location);
    }
  }, [location]);

  useEffect(() => {
    if (agentResponse) {
      localStorage.setItem('forecastResponse', agentResponse);
    }
  }, [agentResponse]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    try {
      const response = await api.getForecast(location);
      if (response && response.content) {
        setAgentResponse(response.content);
      }
    } catch (error) {
      console.error('Failed to load forecast:', error);
      setAgentResponse('Failed to load forecast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLocation('');
    setAgentResponse('');
    localStorage.removeItem('forecastLocation');
    localStorage.removeItem('forecastResponse');
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search location (e.g., Miami, FL)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>
      </div>

      {agentResponse && (
        <>
          {/* Agent Response */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Weather Forecast for {location}</h3>
              <button
                onClick={handleClear}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </div>
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
          </div>
        </>
      )}

      {!agentResponse && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Search for a Location</h3>
          <p className="text-gray-500">Enter a city or address to view the weather forecast</p>
        </div>
      )}
    </div>
  );
};

export default Forecast;
