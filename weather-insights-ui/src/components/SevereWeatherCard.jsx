import React from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ExclamationTriangleIcon, 
  FireIcon,
  CloudIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const SevereWeatherCard = ({ event }) => {
  const getEventIcon = (type) => {
    const iconClass = "h-8 w-8";
    switch (type) {
      case 'hurricane':
        return <CloudIcon className={iconClass} />;
      case 'heat':
        return <FireIcon className={iconClass} />;
      case 'flood':
        return <BoltIcon className={iconClass} />;
      default:
        return <ExclamationTriangleIcon className={iconClass} />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'hurricane':
        return 'from-red-500 to-orange-500';
      case 'heat':
        return 'from-orange-500 to-yellow-500';
      case 'flood':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'Extreme': 'bg-red-600 text-white',
      'Severe': 'bg-orange-600 text-white',
      'Moderate': 'bg-yellow-600 text-white',
      'Minor': 'bg-blue-600 text-white'
    };
    return colors[severity] || 'bg-gray-600 text-white';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${getEventColor(event.type)} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getEventIcon(event.type)}
            <div>
              <h3 className="font-bold text-lg">{event.name}</h3>
              <p className="text-sm opacity-90">{event.location}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityBadge(event.severity)}`}>
            {event.severity}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="text-gray-700 text-sm prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="text-gray-700 text-sm" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
            }}
          >
            {event.description}
          </ReactMarkdown>
        </div>
        
        {event.details && (
          <div className="space-y-2">
            {event.details.intensity && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Intensity:</span>
                <span className="font-semibold text-gray-900">{event.details.intensity}</span>
              </div>
            )}
            {event.details.windSpeed && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Wind Speed:</span>
                <span className="font-semibold text-gray-900">{event.details.windSpeed}</span>
              </div>
            )}
            {event.details.affectedAreas && (
              <div className="text-sm">
                <span className="text-gray-600">Affected Areas:</span>
                <p className="font-semibold text-gray-900 mt-1">{event.details.affectedAreas}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-3 border-t border-gray-200 flex gap-2">
          {event.trackUrl && (
            <a
              href={event.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 text-sm font-medium transition-colors"
            >
              View Track
            </a>
          )}
          {event.advisoryUrl && (
            <a
              href={event.advisoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              Advisory
            </a>
          )}
        </div>

        {/* Last updated */}
        {event.lastUpdate && (
          <p className="text-xs text-gray-500 text-center pt-2">
            Updated: {new Date(event.lastUpdate).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default SevereWeatherCard;
