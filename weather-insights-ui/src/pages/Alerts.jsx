import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FunnelIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const Alerts = () => {
  const [agentResponse, setAgentResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [location] = useState('California');

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlerts = async () => {
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
  );
};

export default Alerts;
