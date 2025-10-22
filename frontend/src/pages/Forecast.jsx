import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon, SunIcon, CloudIcon, BoltIcon, CloudArrowDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const WeatherIcon = ({ conditions, className }) => {
  const normalizedConditions = conditions.toLowerCase();
  if (normalizedConditions.includes('sunny') || normalizedConditions.includes('clear')) {
    return <SunIcon className={className} />;
  }
  if (normalizedConditions.includes('cloud')) {
    return <CloudIcon className={className} />;
  }
  if (normalizedConditions.includes('rain') || normalizedConditions.includes('drizzle')) {
    return <CloudArrowDownIcon className={className} />;
  }
  if (normalizedConditions.includes('thunder') || normalizedConditions.includes('storm')) {
    return <BoltIcon className={className} />;
  }
  return <QuestionMarkCircleIcon className={className} />;
};

const Forecast = () => {
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('forecastLocation') || '';
  });
  const [forecastData, setForecastData] = useState(() => {
    const saved = localStorage.getItem('forecastData');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever location or forecast data changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('forecastLocation', location);
    } else {
      localStorage.removeItem('forecastLocation');
    }
  }, [location]);

  useEffect(() => {
    if (forecastData) {
      localStorage.setItem('forecastData', JSON.stringify(forecastData));
    } else {
      localStorage.removeItem('forecastData');
    }
  }, [forecastData]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[Forecast] Session expired, clearing state');
      setLocation('');
      setForecastData(null);
      localStorage.removeItem('forecastLocation');
      localStorage.removeItem('forecastData');
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setForecastData(null); // Clear previous results immediately
    try {
      const response = await api.getForecast(location);

      if (response && response.content) {
        // The backend sends a JSON string, so we parse it.
        const data = JSON.parse(response.content);
        setForecastData(data);
      } else {
        console.log('API response was empty or had no content.');
      }
    } catch (error) {
      console.error('A detailed error occurred while fetching the forecast:', error);
      setForecastData({ error: 'Failed to load or parse forecast. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLocation('');
    setForecastData(null);
    localStorage.removeItem('forecastLocation');
    localStorage.removeItem('forecastData');
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

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading forecast for {location}...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      {forecastData && !loading && (
        <div className="space-y-6">
          {/* Error Display */}
          {forecastData.error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
              <p className="font-bold">Error</p>
              <p>{forecastData.error}</p>
            </div>
          )}

          {/* Main Forecast Display */}
          {!forecastData.error && (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Weather Forecast for {forecastData.location}</h3>
                  <button
                    onClick={handleClear}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>New Search</span>
                  </button>
                </div>

                {/* Current Conditions */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Current Conditions</h4>
                  <p className="text-gray-700">{forecastData.current_conditions}</p>
                </div>

                {/* 7-Day Forecast */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">7-Day Forecast</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
                    {forecastData.daily_forecasts?.map((day) => (
                      <div key={day.date} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="font-bold text-gray-800">{day.day.substring(0, 3)}</p>
                        <WeatherIcon conditions={day.conditions} className="h-10 w-10 mx-auto my-2 text-primary" />
                        <p className="font-semibold text-gray-900">{day.high_temp}°</p>
                        <p className="text-sm text-gray-500">{day.low_temp}°</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Planning Insights</h4>
                  <p className="text-gray-700 leading-relaxed">{forecastData.insights}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!forecastData && !loading && (
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
