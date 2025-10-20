import React, { useState } from 'react';
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const AlertCard = ({ alert }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityColor = (severity) => {
    const colors = {
      extreme: 'bg-extreme text-white',
      severe: 'bg-severe text-white',
      moderate: 'bg-moderate text-white',
      minor: 'bg-minor text-white',
    };
    return colors[severity?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  const getSeverityIcon = (severity) => {
    return severity?.toLowerCase() === 'extreme' || severity?.toLowerCase() === 'severe' 
      ? '🔴' 
      : severity?.toLowerCase() === 'moderate' 
      ? '🟠' 
      : '🟡';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-l-4 border-extreme hover:shadow-lg transition-shadow">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{alert.summary}</p>
              {alert.location && (
                <p className="text-xs text-gray-500 mt-1">📍 {alert.location}</p>
              )}
            </div>
          </div>
          <button className="ml-4 text-gray-400 hover:text-gray-600">
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              {alert.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Details:</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                </div>
              )}
              {alert.instructions && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Instructions:</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.instructions}</p>
                </div>
              )}
              {alert.onset && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Onset:</span> {new Date(alert.onset).toLocaleString()}
                </div>
              )}
              {alert.expires && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Expires:</span> {new Date(alert.expires).toLocaleString()}
                </div>
              )}
              <div className="flex space-x-2 mt-4">
                <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-900 text-sm font-medium">
                  View Details
                </button>
                <button className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-indigo-600 text-sm font-medium">
                  Analyze Risk
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
