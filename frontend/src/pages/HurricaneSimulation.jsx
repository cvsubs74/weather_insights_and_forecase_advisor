import React, { useState, useRef } from 'react';
import { 
  CloudIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import LocationMap from '../components/LocationMap';
import api from '../services/api';

const HurricaneSimulation = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      console.log('[HurricaneSimulation] Starting analysis...');
      const result = await api.analyzeHurricaneImage(selectedImage);
      console.log('[HurricaneSimulation] Analysis result:', result);
      setAnalysisResult(result);
      
      // Create map markers from prioritized locations (EvacuationPlan schema)
      if (result && result.prioritized_locations && result.prioritized_locations.length > 0) {
        const markers = result.prioritized_locations.map((location, index) => ({
          lat: location.latitude,
          lng: location.longitude,
          title: `Priority #${index + 1} - Risk: ${location.risk_score.toFixed(2)}`,
          address: `Coordinates: ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
        }));
        setMapMarkers(markers);
        
        // Set map center to the first (highest priority) location
        if (markers.length > 0) {
          setMapCenter([markers[0].lat, markers[0].lng]);
        }
        
        console.log(`[HurricaneSimulation] Created ${markers.length} map markers from evacuation plan`);
      } else {
        console.log('[HurricaneSimulation] No prioritized locations in evacuation plan:', result);
        setMapMarkers([]);
        setMapCenter(null);
      }
    } catch (err) {
      console.error('[HurricaneSimulation] Analysis error:', err);
      setError(err.message || 'Failed to analyze hurricane image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setError(null);
    setMapMarkers([]);
    setMapCenter(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getRiskLevelColor = (riskScore) => {
    if (riskScore >= 60) return 'text-red-600 bg-red-50';
    if (riskScore >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskLevelText = (riskScore) => {
    if (riskScore >= 60) return 'High Risk';
    if (riskScore >= 40) return 'Moderate Risk';
    return 'Low Risk';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CloudIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hurricane Simulation</h1>
            <p className="text-gray-600">Upload a hurricane image to analyze evacuation priorities and flood risks</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              imagePreview ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Hurricane preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>Analyze Hurricane</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearImage}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Upload Hurricane Image</p>
                  <p className="text-gray-500">Drag and drop or click to select</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>Choose File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Hurricane Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <CloudIcon className="h-6 w-6 text-blue-600" />
              <span>Hurricane Analysis</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600">Category</div>
                <div className="text-2xl font-bold text-blue-900">
                  {analysisResult.hurricane_category}
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-600">Affected States</div>
                <div className="text-lg font-semibold text-orange-900">
                  {analysisResult.affected_states?.join(', ') || 'N/A'}
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm font-medium text-red-600">High-Risk Locations</div>
                <div className="text-2xl font-bold text-red-900">
                  {analysisResult.total_high_risk_locations}
                </div>
              </div>
            </div>
          </div>

          {/* Evacuation Priorities Map */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPinIcon className="h-6 w-6 text-red-600" />
              <span>High-Risk Evacuation Areas</span>
            </h2>
            
            {analysisResult.prioritized_locations && analysisResult.prioritized_locations.length > 0 && (
              <div className="space-y-4">
                {/* Interactive Map */}
                <LocationMap 
                  center={mapCenter}
                  markers={mapMarkers}
                  height="450px" 
                />
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>High-Risk Evacuation Areas:</strong> {analysisResult.total_high_risk_locations || analysisResult.prioritized_locations.length} locations identified
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Red markers show evacuation priority locations. Click markers for risk details and coordinates.
                  </p>
                  <p className="text-xs text-gray-600">
                    Highest Risk Score: {analysisResult.highest_risk_score?.toFixed(2)}/10
                  </p>
                  {analysisResult.affected_states && (
                    <p className="text-xs text-gray-600">
                      Affected States: {analysisResult.affected_states.join(', ')}
                    </p>
                  )}
                </div>

                {/* Top Priority Locations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Priority Locations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysisResult.prioritized_locations.slice(0, 6).map((location, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium text-gray-600">
                            Priority #{index + 1}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(location.risk_score)}`}>
                            {getRiskLevelText(location.risk_score)}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Location:</span> {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Risk Score:</span> {location.risk_score.toFixed(2)}
                          </div>
                          {location.details?.historical_precipitation_inches && (
                            <div className="text-sm">
                              <span className="font-medium">Precipitation:</span> {location.details.historical_precipitation_inches}"
                            </div>
                          )}
                          {location.details?.last_event_date && (
                            <div className="text-sm">
                              <span className="font-medium">Last Event:</span> {location.details.last_event_date}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insights */}
          {analysisResult.insights && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <InformationCircleIcon className="h-6 w-6 text-blue-600" />
                <span>Analysis Insights</span>
              </h2>
              
              <div className="space-y-4">
                {Object.entries(analysisResult.insights).map(([key, value]) => (
                  <div key={key} className="border-l-4 border-blue-500 pl-4">
                    <div className="font-medium text-gray-900 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-700 mt-1">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HurricaneSimulation;
