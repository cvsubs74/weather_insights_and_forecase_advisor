import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LocationMap from '../components/LocationMap';
import api from '../services/api';

const resourceDetails = {
  shelters: { icon: '🏠', title: 'Emergency Shelters' },
  hospitals: { icon: '🏥', title: 'Hospitals' },
  pharmacies: { icon: '💊', title: 'Pharmacies' },
};

const EmergencyResources = () => {
  const [location, setLocation] = useState(() => localStorage.getItem('emergencyLocation') || '');
  const [resourceType, setResourceType] = useState(() => localStorage.getItem('emergencyResourceType') || 'shelters');
  const [radius, setRadius] = useState(() => Number(localStorage.getItem('emergencyRadius')) || 10);
  const [agentResponse, setAgentResponse] = useState(() => localStorage.getItem('emergencyResponse') || '');
  const [fullResponse, setFullResponse] = useState(() => JSON.parse(localStorage.getItem('emergencyFullResponse') || 'null'));
  const [mapMarkers, setMapMarkers] = useState(() => JSON.parse(localStorage.getItem('emergencyMapMarkers') || '[]'));
  const [mapCenter, setMapCenter] = useState(() => JSON.parse(localStorage.getItem('emergencyMapCenter') || 'null'));
  const [loading, setLoading] = useState(false);

  // Save state to localStorage
  useEffect(() => { localStorage.setItem('emergencyLocation', location); }, [location]);
  useEffect(() => { localStorage.setItem('emergencyResourceType', resourceType); }, [resourceType]);
  useEffect(() => { localStorage.setItem('emergencyRadius', radius.toString()); }, [radius]);
  useEffect(() => { localStorage.setItem('emergencyResponse', agentResponse); }, [agentResponse]);
  useEffect(() => { localStorage.setItem('emergencyFullResponse', JSON.stringify(fullResponse)); }, [fullResponse]);
  useEffect(() => { localStorage.setItem('emergencyMapMarkers', JSON.stringify(mapMarkers)); }, [mapMarkers]);
  useEffect(() => { localStorage.setItem('emergencyMapCenter', JSON.stringify(mapCenter)); }, [mapCenter]);

  // Session expiration handler
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[EmergencyResources] Session expired, clearing state');
      setLocation('');
      setResourceType('shelters');
      setRadius(10);
      setAgentResponse('');
      setFullResponse(null);
      setMapMarkers([]);
      setMapCenter(null);
    };
    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, []);

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!location) return;

    setLoading(true);
    try {
      const response = await api.findResources(location, resourceType, radius);
      setFullResponse(response);
      if (response) {
        setAgentResponse(response.insights || 'No additional insights were provided.');
        const facilities = response[resourceType] || [];
        const markers = facilities.map(facility => ({
          lat: facility.coordinates.lat,
          lng: facility.coordinates.lng,
          title: facility.name,
          address: facility.address
        }));
        setMapMarkers(markers);

        if (markers.length > 0) {
          setMapCenter([markers[0].lat, markers[0].lng]);
        } else {
          const geocodeResponse = await api.geocode(location);
          if (geocodeResponse && geocodeResponse.lat) {
            setMapCenter([geocodeResponse.lat, geocodeResponse.lng]);
          } else {
            setMapCenter(null);
          }
        }
      } else {
        setAgentResponse('No resources found for the specified location.');
        setFullResponse(null);
        setMapMarkers([]);
        setMapCenter(null);
      }
    } catch (error) {
      console.error('Failed to search resources:', error);
      setAgentResponse('Failed to search resources. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [location, resourceType, radius]);


  const handleClear = () => {
    setLocation('');
    setResourceType('shelters');
    setRadius(10);
    setAgentResponse('');
    setFullResponse(null);
    setMapMarkers([]);
    setMapCenter(null);
    localStorage.removeItem('emergencyLocation');
    localStorage.removeItem('emergencyResourceType');
    localStorage.removeItem('emergencyRadius');
    localStorage.removeItem('emergencyResponse');
    localStorage.removeItem('emergencyFullResponse');
    localStorage.removeItem('emergencyMapMarkers');
    localStorage.removeItem('emergencyMapCenter');
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Emergency Resources</h2>
          {agentResponse && (
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📍 Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Downtown Houston, TX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="shelters">Emergency Shelters</option>
                <option value="hospitals">Hospitals</option>
                <option value="pharmacies">Pharmacies</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Radius (miles)</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !location}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Resources'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center" style={{minHeight: '500px'}}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Searching for {resourceDetails[resourceType]?.title.toLowerCase()}...</p>
              <p className="text-gray-500 text-sm mt-2">Near {location}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center" style={{minHeight: '500px'}}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading results...</p>
            </div>
          </div>
        </div>
      )}

      {agentResponse && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map View - Show locations with markers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📍 {mapMarkers.length > 0 ? `${mapMarkers.length} Locations Found` : 'Search Area'}
            </h3>
            <LocationMap 
              center={mapCenter}
              markers={mapMarkers}
              height="450px" 
            />
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Searching near:</strong> {location}
              </p>
              {mapMarkers.length > 0 ? (
                <p className="text-xs text-gray-600 mt-1">
                  Red markers show {resourceDetails[resourceType]?.title.toLowerCase()} locations. Click markers for details and directions.
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  No locations found for this search.
                </p>
              )}
            </div>
          </div>
          
          {/* Results List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {resourceDetails[resourceType]?.icon || '📍'} {resourceDetails[resourceType]?.title || 'Resources'} near {location}
            </h3>
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                {(fullResponse && fullResponse[resourceType] && fullResponse[resourceType].length > 0) ? (
                  fullResponse[resourceType].map((facility, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h4 className="font-bold text-gray-800">{facility.name}</h4>
                      <p className="text-sm text-gray-600">{facility.address}</p>
                      <p className="text-sm text-gray-500 mt-1">{facility.distance.toFixed(1)} miles away</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No {resourceType} found for this search.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Agent Insights</h4>
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 ml-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                  }}
                >
                  {agentResponse}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {!agentResponse && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <MapPinIcon className="h-24 w-24 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Find Emergency Resources</h3>
          <p className="text-gray-500">Search for shelters, hospitals, or other emergency resources near any location</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyResources;
