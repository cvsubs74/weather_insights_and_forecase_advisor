import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FunnelIcon } from '@heroicons/react/24/outline';
import LocationMap from '../components/LocationMap';
import api from '../services/api';

const Alerts = () => {
  const [agentResponse, setAgentResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [location] = useState('California');
  const [alertMarkers, setAlertMarkers] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  
  // Helper function to get severity emoji
  const getSeverityEmoji = (severity) => {
    const severityLower = severity?.toLowerCase() || '';
    if (severityLower.includes('severe') || severityLower.includes('extreme')) return '🔴';
    if (severityLower.includes('moderate')) return '🟡';
    if (severityLower.includes('minor')) return '🟢';
    return '⚠️';
  };

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.getAlerts(location);
      
      // California center as default
      const californiaCenter = [36.7783, -119.4179];
      const locationMap = {
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
        'Phoenix': [33.4484, -112.0740]
      };
      
      // Check if we have structured alerts from JSON
      if (response && response.alerts && Array.isArray(response.alerts) && response.alerts.length > 0) {
        console.log('[Alerts] Using structured alerts from JSON:', response.alerts);
        
        // Create user-friendly formatted text response
        const alertCount = response.alerts.length;
        const formattedText = `# 🚨 Active Weather Alerts for ${location}\n\n` +
          `Found **${alertCount}** active alert${alertCount !== 1 ? 's' : ''}:\n\n---\n\n` +
          response.alerts.map((alert, index) => 
            `### ${index + 1}. ${alert.event}\n\n` +
            `**Severity:** ${getSeverityEmoji(alert.severity)} ${alert.severity}\n\n` +
            `**Details:** ${alert.headline}\n\n---`
          ).join('\n\n');
        
        setAgentResponse(formattedText);
        
        // Extract markers from headlines
        const markers = [];
        response.alerts.forEach(alert => {
          Object.entries(locationMap).forEach(([name, coords]) => {
            if (alert.headline.toLowerCase().includes(name.toLowerCase())) {
              markers.push({
                lat: coords[0],
                lng: coords[1],
                title: name,
                address: alert.event
              });
            }
          });
        });
        
        setAlertMarkers(markers);
        setMapCenter(markers.length > 0 ? [markers[0].lat, markers[0].lng] : californiaCenter);
      } else if (response && response.content) {
        // Fallback: Try to parse JSON from content
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*"alerts"[\s\S]*\}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData.alerts && Array.isArray(jsonData.alerts)) {
              const alertCount = jsonData.alerts.length;
              const formattedText = `# 🚨 Active Weather Alerts for ${location}\n\n` +
                `Found **${alertCount}** active alert${alertCount !== 1 ? 's' : ''}:\n\n---\n\n` +
                jsonData.alerts.map((alert, index) => 
                  `### ${index + 1}. ${alert.event}\n\n` +
                  `**Severity:** ${getSeverityEmoji(alert.severity)} ${alert.severity}\n\n` +
                  `**Details:** ${alert.headline}\n\n---`
                ).join('\n\n');
              
              setAgentResponse(formattedText);
              
              // Extract markers
              const markers = [];
              jsonData.alerts.forEach(alert => {
                Object.entries(locationMap).forEach(([name, coords]) => {
                  if (alert.headline.toLowerCase().includes(name.toLowerCase())) {
                    markers.push({
                      lat: coords[0],
                      lng: coords[1],
                      title: name,
                      address: alert.event
                    });
                  }
                });
              });
              
              setAlertMarkers(markers);
              setMapCenter(markers.length > 0 ? [markers[0].lat, markers[0].lng] : californiaCenter);
              return;
            }
          }
        } catch (e) {
          console.error('[Alerts] Failed to parse JSON from content:', e);
        }
        
        // If no JSON found, use raw content
        setAgentResponse(response.content);
        
        // Parse markers from raw content
        const markers = [];
        Object.entries(locationMap).forEach(([name, coords]) => {
          if (response.content.toLowerCase().includes(name.toLowerCase())) {
            markers.push({
              lat: coords[0],
              lng: coords[1],
              title: name,
              address: 'Alert Zone'
            });
          }
        });
        
        setAlertMarkers(markers);
        setMapCenter(markers.length > 0 ? [markers[0].lat, markers[0].lng] : californiaCenter);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Active Weather Alerts</h2>
            <p className="text-sm text-gray-500 mt-1">Real-time weather warnings and advisories for {location}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Map */}
        {!loading && alertMarkers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📍 Alert Zones ({alertMarkers.length})
            </h3>
            <LocationMap 
              center={mapCenter}
              markers={alertMarkers}
              height="450px" 
            />
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Alert Locations:</strong> {location}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Red markers show areas with active weather alerts. Click markers for location details.
              </p>
            </div>
          </div>
        )}

        {/* Alert Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
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
              <p>No active alerts in your area</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
