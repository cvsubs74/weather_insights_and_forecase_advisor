import React from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ExclamationTriangleIcon,
  CloudIcon, // For hurricanes/cyclones
  FireIcon, // For heatwaves
  BoltIcon, // For thunderstorms
  ShieldCheckIcon, // For general warnings
} from '@heroicons/react/24/outline';

const SevereWeatherCard = ({ event, onAnalyzeRisk }) => {
  const getEventIcon = (eventName) => {
    const lowerEvent = eventName.toLowerCase();
    const iconClass = "h-8 w-8 text-white";
    if (lowerEvent.includes('hurricane') || lowerEvent.includes('tropical storm')) return <CloudIcon className={iconClass} />;
    if (lowerEvent.includes('heat')) return <FireIcon className={iconClass} />;
    if (lowerEvent.includes('thunderstorm')) return <BoltIcon className={iconClass} />;
        if (lowerEvent.includes('flood') || lowerEvent.includes('coastal')) return <ExclamationTriangleIcon className={iconClass} />;
    return <ShieldCheckIcon className={iconClass} />;
  };

  const getEventColor = (severity) => {
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity === 'extreme') return 'from-red-600 to-red-800';
    if (lowerSeverity === 'severe') return 'from-orange-500 to-orange-700';
    if (lowerSeverity === 'moderate') return 'from-yellow-500 to-yellow-700';
    return 'from-gray-500 to-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getEventColor(event.severity)} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {getEventIcon(event.event)}
            <div className="flex-1">
              <h3 className="font-bold text-lg truncate">{event.event}</h3>
              <div className="text-sm opacity-90 truncate prose prose-sm prose-invert">
                <ReactMarkdown
                  components={{
                    a: ({node, children, ...props}) => <a {...props} className="text-white underline hover:text-blue-200" target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {event.headline}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-grow flex flex-col">
        <div className="text-gray-700 text-sm prose prose-sm max-w-none flex-grow">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="text-gray-700 mb-2" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
              a: ({node, children, ...props}) => <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
              ul: ({node, ...props}) => <div className="space-y-1" {...props} />,
              li: ({node, ...props}) => <p className="text-gray-700 mb-0" {...props} />,
            }}
          >
            {event.description}
          </ReactMarkdown>
        </div>
        
        {/* Details and Actions */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gray-700`}>
              {event.severity}
            </span>
            <span className="text-gray-500">
              Ends: {new Date(event.end_time).toLocaleDateString()} at {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button 
            onClick={() => onAnalyzeRisk(event)}
            className="block w-full text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium transition-colors disabled:opacity-50"
            disabled={!onAnalyzeRisk}
          >
            Analyze Risk
          </button>
        </div>
      </div>
    </div>
  );
};

export default SevereWeatherCard;
