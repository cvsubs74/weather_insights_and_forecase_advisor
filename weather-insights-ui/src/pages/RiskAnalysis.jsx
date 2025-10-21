import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExclamationTriangleIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const RiskAnalysis = () => {
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('riskLocation') || '';
  });
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('riskAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedAlert, setSelectedAlert] = useState(() => {
    const saved = localStorage.getItem('riskSelectedAlert');
    return saved ? JSON.parse(saved) : null;
  });
  const [riskAnalysis, setRiskAnalysis] = useState(() => {
    return localStorage.getItem('riskAnalysis') || '';
  });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (location) localStorage.setItem('riskLocation', location);
  }, [location]);

  useEffect(() => {
    if (alerts.length > 0) localStorage.setItem('riskAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    if (selectedAlert) localStorage.setItem('riskSelectedAlert', JSON.stringify(selectedAlert));
  }, [selectedAlert]);

  useEffect(() => {
    if (riskAnalysis) localStorage.setItem('riskAnalysis', riskAnalysis);
  }, [riskAnalysis]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[RiskAnalysis] Session expired, clearing state');
      setLocation('');
      setAlerts([]);
      setSelectedAlert(null);
      setRiskAnalysis('');
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, []);

  const handleSearchAlerts = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoadingAlerts(true);
    setAlerts([]);
    setSelectedAlert(null);
    setRiskAnalysis('');
    
    try {
      const response = await api.getAlerts(location);
      if (response && response.content) {
        // Parse the response to extract individual alerts
        const alertMatches = response.content.match(/\*\s*([^-\n]+)\s*-\s*([^\n]+)/g) || [];
        const parsedAlerts = alertMatches.map((match, index) => {
          const parts = match.replace(/^\*\s*/, '').split(' - ');
          return {
            id: index,
            event: parts[0]?.trim() || 'Unknown Event',
            headline: parts[1]?.trim() || 'No details available',
            fullText: match
          };
        });
        
        setAlerts(parsedAlerts.length > 0 ? parsedAlerts : [
          { id: 0, event: 'No specific alerts', headline: 'Check the full response below', fullText: response.content }
        ]);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAnalyzeAlert = async (alert) => {
    setSelectedAlert(alert);
    setLoadingAnalysis(true);
    setRiskAnalysis('');
    
    try {
      const response = await api.analyzeRisk(alert.event, location);
      if (response && response.content) {
        setRiskAnalysis(response.content);
      }
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      setRiskAnalysis('Failed to analyze risk. Please try again.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleClear = () => {
    setLocation('');
    setAlerts([]);
    setSelectedAlert(null);
    setRiskAnalysis('');
    localStorage.removeItem('riskLocation');
    localStorage.removeItem('riskAlerts');
    localStorage.removeItem('riskSelectedAlert');
    localStorage.removeItem('riskAnalysis');
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Search for Alerts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">1</div>
            <h2 className="text-2xl font-bold text-gray-900">Search for Active Alerts</h2>
          </div>
          {(alerts.length > 0 || riskAnalysis) && (
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <form onSubmit={handleSearchAlerts} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📍 Location</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location (e.g., California, Miami FL, or 'all US states')"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loadingAlerts || !location.trim()}
                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50"
              >
                {loadingAlerts ? 'Searching...' : 'Search Alerts'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loading Alerts */}
      {loadingAlerts && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Searching for alerts in {location}...</p>
        </div>
      )}

      {/* Step 2: Select Alert for Analysis */}
      {alerts.length > 0 && !loadingAlerts && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">2</div>
            <h2 className="text-2xl font-bold text-gray-900">Select an Alert to Analyze</h2>
          </div>
          <p className="text-gray-600 mb-4">Found {alerts.length} active alert{alerts.length !== 1 ? 's' : ''} in {location}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAnalyzeAlert(alert)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedAlert?.id === alert.id
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{alert.event}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{alert.headline}</p>
                  </div>
                </div>
                {selectedAlert?.id === alert.id && (
                  <div className="mt-3 flex items-center text-sm text-primary font-medium">
                    <ChartBarIcon className="h-4 w-4 mr-1" />
                    Analyzing...
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Analysis */}
      {loadingAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Analyzing risk for {selectedAlert?.event}...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      )}

      {/* Step 3: Risk Analysis Results */}
      {riskAnalysis && !loadingAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">3</div>
            <h2 className="text-2xl font-bold text-gray-900">Risk Analysis Results</h2>
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              <p className="font-semibold text-gray-900">{selectedAlert?.event}</p>
            </div>
            <p className="text-sm text-gray-600 mt-1">{location}</p>
          </div>

          <div className="prose max-w-none">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4" {...props} />,
                p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 ml-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-2" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                hr: ({node, ...props}) => <hr className="my-6 border-gray-300" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-gray-600 my-4" {...props} />,
              }}
            >
              {riskAnalysis}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingAlerts && alerts.length === 0 && !riskAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <ChartBarIcon className="h-24 w-24 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Risk Analysis Workflow</h3>
          <p className="text-gray-500 mb-4">Follow the steps above to perform risk analysis:</p>
          <ol className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Search for active weather alerts in your area</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Select an alert to analyze</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Review the detailed risk analysis and recommendations</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;
