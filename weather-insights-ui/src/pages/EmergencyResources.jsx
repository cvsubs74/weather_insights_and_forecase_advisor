import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MagnifyingGlassIcon, MapPinIcon, BuildingOffice2Icon, PhoneIcon } from '@heroicons/react/24/outline';
import MapEmbed from '../components/MapEmbed';
import api from '../services/api';

const EmergencyResources = () => {
  const [location, setLocation] = useState('');
  const [resourceType, setResourceType] = useState('shelters');
  const [radius, setRadius] = useState(10);
  const [agentResponse, setAgentResponse] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!location) return;

    // Clear previous results and show loading
    setAgentResponse('');
    setMapUrl('');
    setLoading(true);
    
    try {
      let response;
      if (resourceType === 'shelters') {
        response = await api.findShelters(location, radius);
      } else {
        response = await api.findHospitals(location, radius);
      }
      
      if (response && response.content) {
        // Extract map URL from response
        const mapUrlMatch = response.content.match(/https:\/\/www\.google\.com\/maps[^\s)]+/);
        let cleanedContent = response.content;
        
        if (mapUrlMatch) {
          const originalUrl = mapUrlMatch[0];
          console.log('Found map URL:', originalUrl);
          
          // Use the URL directly - it's already formatted for embedding
          setMapUrl(originalUrl);
          
          // Remove the map URL and surrounding text from the response
          cleanedContent = cleanedContent
            .replace(/Would you like me to find alternative routes or additional locations\?\s*/gi, '')
            .replace(/View map:\s*https:\/\/www\.google\.com\/maps[^\s)]+/g, '')
            .replace(/\n\n+/g, '\n\n')
            .trim();
        } else {
          console.log('No map URL found in response');
          setMapUrl('');
        }
        
        setAgentResponse(cleanedContent);
      }
    } catch (error) {
      console.error('Failed to search resources:', error);
      setAgentResponse('Failed to search resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when resourceType or radius changes (if location is already set)
  React.useEffect(() => {
    if (location && agentResponse) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType, radius]);

  const handleGetDirections = (resource) => {
    // In production, this would open Google Maps or calculate route
    alert(`Getting directions to ${resource.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Resources</h2>
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
              <p className="text-gray-600 text-lg font-medium">Searching for {resourceType === 'shelters' ? 'shelters' : 'hospitals'}...</p>
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
          {/* Map View - Show search location */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📍 Your Search Location</h3>
            <MapEmbed 
              mapUrl={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} 
              height="450px" 
            />
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Searching near:</strong> {location}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Click "Open in Google Maps" to see nearby {resourceType === 'shelters' ? 'shelters' : 'hospitals'} with directions
              </p>
            </div>
          </div>
          
          {/* Results List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {resourceType === 'shelters' ? '🏠 Emergency Shelters' : '🏥 Hospitals'} near {location}
            </h3>
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
                  a: ({node, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {agentResponse}
              </ReactMarkdown>
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
