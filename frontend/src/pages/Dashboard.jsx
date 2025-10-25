import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LocationMap from '../components/LocationMap';
import RiskAnalysisModal from '../components/RiskAnalysisModal';
import SevereWeatherCard from '../components/SevereWeatherCard';
import api from '../services/api';
import { 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon, 
  MapPinIcon, 
  MapIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('dashboardAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [agentResponse, setAgentResponse] = useState(() => {
    return localStorage.getItem('dashboardResponse') || '';
  });
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('dashboardLocation') || '';
  });
  const [selectedFilter, setSelectedFilter] = useState(() => {
    return localStorage.getItem('dashboardFilter') || '';
  });
  const [selectedState, setSelectedState] = useState(() => {
    const saved = localStorage.getItem('dashboardSelectedState');
    return saved || '';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(() => {
    return localStorage.getItem('dashboardSelectedRegion') || 'National';
  });
  const [alertMarkers, setAlertMarkers] = useState(() => {
    const saved = localStorage.getItem('dashboardMarkers');
    return saved ? JSON.parse(saved) : [];
  });
  const [mapCenter, setMapCenter] = useState(() => {
    const saved = localStorage.getItem('dashboardMapCenter');
    return saved ? JSON.parse(saved) : [39.8283, -98.5795];
  });
  const [severeEvents, setSevereEvents] = useState(() => {
    const saved = localStorage.getItem('dashboardSevereEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const eventsPerPage = 3;

  // State for Risk Analysis Modal
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [selectedAlertForAnalysis, setSelectedAlertForAnalysis] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (agentResponse) localStorage.setItem('dashboardResponse', agentResponse);
  }, [agentResponse]);

  useEffect(() => {
    if (location) localStorage.setItem('dashboardLocation', location);
  }, [location]);

  useEffect(() => {
    localStorage.setItem('dashboardFilter', selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    if (alertMarkers.length > 0) localStorage.setItem('dashboardMarkers', JSON.stringify(alertMarkers));
  }, [alertMarkers]);

  useEffect(() => {
    if (mapCenter) localStorage.setItem('dashboardMapCenter', JSON.stringify(mapCenter));
  }, [mapCenter]);

  useEffect(() => {
    if (severeEvents.length > 0) localStorage.setItem('dashboardSevereEvents', JSON.stringify(severeEvents));
  }, [severeEvents]);

  useEffect(() => {
    if (alerts.length > 0) localStorage.setItem('dashboardAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('dashboardSelectedState', selectedState);
  }, [selectedState]);

  useEffect(() => {
    localStorage.setItem('dashboardSelectedRegion', selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    // Auto-load national alerts on mount - only run once
    const hasLoadedInitial = sessionStorage.getItem('dashboardInitialLoad');
    
    if (!hasLoadedInitial) {
      sessionStorage.setItem('dashboardInitialLoad', 'true');
      
      const savedAlerts = localStorage.getItem('dashboardAlerts');
      const savedRegion = localStorage.getItem('dashboardSelectedRegion');
      
      if (!savedAlerts || savedAlerts === '[]') {
        // Default to National search on first load
        setSelectedRegion('National');
        setSelectedFilter('region');
        setLocation('all US states');
        loadAlerts('all US states');
      } else if (savedRegion === 'National') {
        // Maintain National selection if it was previously selected
        setSelectedRegion('National');
      }
      
      // Load severe weather events on mount
      const savedEvents = localStorage.getItem('dashboardSevereEvents');
      if (!savedEvents || savedEvents === '[]') {
        loadSevereWeatherEvents();
      }
    }
    
    // Listen for session expiration events
    const handleSessionExpired = () => {
      console.log('[Dashboard] Session expired, clearing state');
      // Clear all dashboard state
      setAgentResponse('');
      setLocation('');
      setSelectedFilter('');
      setAlertMarkers([]);
      setMapCenter([39.8283, -98.5795]);
      setSevereEvents([]);
      setAlerts([]);
      localStorage.removeItem('dashboardSevereEvents');
      localStorage.removeItem('dashboardAlerts');
      // Reload both severe weather events and national alerts
      loadSevereWeatherEvents();
      loadNationalSevereAlerts();
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeRisk = async (alert) => {
    setSelectedAlertForAnalysis(alert);
    setIsRiskModalOpen(true);
    setIsAnalyzingRisk(true);
    setRiskAnalysis(null); // Clear previous analysis
    try {
      const response = await api.analyzeRisk(alert);
      setRiskAnalysis(response);
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      setRiskAnalysis({ error: 'Failed to analyze risk. Please try again.' }); // Set an error state
    } finally {
      setIsAnalyzingRisk(false);
    }
  };

  const loadAlerts = async (currentLocation) => {
    if (loading) return;
    setLoading(true);
    setAlerts([]);
    setAgentResponse('');
    try {
      const response = await api.getAlerts(currentLocation);
      if (response && response.alerts && Array.isArray(response.alerts)) {
        setAlerts(response.alerts);
        if (response.alerts.length > 0) {
          setAgentResponse(`Found ${response.alerts.length} alerts for ${currentLocation}.`);
          
          // Handle map_data with proper structure parsing
          if (response.map_data) {
            console.log('[Dashboard] Location-specific map data:', response.map_data);
            
            // Set map center if available
            if (response.map_data.center) {
              const newCenter = [response.map_data.center.lat, response.map_data.center.lng];
              console.log('[Dashboard] Setting map center to:', newCenter);
              setMapCenter(newCenter);
            } else {
              console.log('[Dashboard] No map center in response, keeping current center');
            }
            
            // Handle markers with flexible structure parsing
            let markers = [];
            if (response.map_data.markers && Array.isArray(response.map_data.markers) && response.map_data.markers.length > 0) {
              markers = response.map_data.markers;
              console.log('[Dashboard] Using location-specific markers array:', markers);
            } else if (typeof response.map_data === 'object' && Object.keys(response.map_data).length > 0) {
              // Handle object structure like {location: {lat, lng, ...}}
              markers = Object.entries(response.map_data)
                .filter(([key, value]) => key !== 'center' && key !== 'zoom' && key !== 'map_url')
                .map(([location, data]) => ({
                  lat: data.lat || 39.8283,
                  lng: data.lng || -98.5795,
                  title: location,
                  address: data.address || ''
                }));
              console.log('[Dashboard] Using location-specific map data object:', markers);
            }
            setAlertMarkers(markers);
          } else {
            // No map data, clear markers
            setAlertMarkers([]);
          }
        } else {
          setAgentResponse(`No active alerts found for ${currentLocation}.`);
          setAlertMarkers([]); // Clear markers when no alerts are found
        }
      } else {
        setAgentResponse(response?.content || `No active alerts found for ${currentLocation}.`);
        
        // Handle map_data even when no structured alerts
        if (response.map_data) {
          console.log('[Dashboard] Location-specific map data (no alerts):', response.map_data);
          
          if (response.map_data.center) {
            const newCenter = [response.map_data.center.lat, response.map_data.center.lng];
            console.log('[Dashboard] Setting map center (no alerts) to:', newCenter);
            setMapCenter(newCenter);
          }
          
          let markers = [];
          if (response.map_data.markers && Array.isArray(response.map_data.markers)) {
            markers = response.map_data.markers;
          } else if (typeof response.map_data === 'object') {
            markers = Object.entries(response.map_data)
              .filter(([key, value]) => key !== 'center' && key !== 'zoom' && key !== 'map_url')
              .map(([location, data]) => ({
                lat: data.lat || 39.8283,
                lng: data.lng || -98.5795,
                title: location,
                address: data.address || ''
              }));
          }
          setAlertMarkers(markers);
        } else {
          setAlertMarkers([]);
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAgentResponse('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSevereWeatherEvents = async () => {
    if (loadingEvents) return;
    
    setLoadingEvents(true);
    try {
      const response = await api.getSevereWeatherEvents();
      
      // Parse the response to extract severe weather events
      const events = parseSevereWeatherEvents(response);
      setSevereEvents(events);
    } catch (error) {
      console.error('Failed to load severe weather events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const parseSevereWeatherEvents = (response) => {
    const events = [];
    const seenStorms = new Set(); // Track unique storms
    
    // Parse hurricanes from response
    if (response.hurricanes?.content) {
      const hurricaneText = response.hurricanes.content.toLowerCase();
      
      // Look for hurricane/tropical storm mentions
      if (hurricaneText.includes('hurricane') || hurricaneText.includes('tropical storm')) {
        // Extract storm names and details (simplified parsing)
        const lines = response.hurricanes.content.split('\n');
        
        for (const line of lines) {
          // Skip lines that are just about hurricane path/visualization
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('hurricane path') || 
              lowerLine.includes('view hurricane') ||
              lowerLine.includes('visualization') ||
              lowerLine.includes('view in google earth') ||
              lowerLine.includes('download kmz') ||
              lowerLine.includes('how to view') ||
              lowerLine.includes('forecast cone') ||
              lowerLine.includes('track path') ||
              line.trim().startsWith('**View') ||
              line.trim().startsWith('**Download') ||
              line.trim().startsWith('**How to')) {
            continue;
          }
          
          if (line.includes('Hurricane') || line.includes('Tropical Storm')) {
            const nameMatch = line.match(/(Hurricane|Tropical Storm)\s+(\w+)/i);
            if (nameMatch) {
              const stormName = nameMatch[2];
              
              // Skip if we've already seen this storm
              if (seenStorms.has(stormName)) {
                continue;
              }
              seenStorms.add(stormName);
              
              // Extract a shorter description (first sentence or up to 100 chars)
              const fullDesc = line.trim();
              const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
              
              const currentStorm = {
                type: 'hurricane',
                name: `${nameMatch[1]} ${nameMatch[2]}`,
                location: 'Atlantic/Pacific',
                severity: line.toLowerCase().includes('hurricane') ? 'Extreme' : 'Severe',
                description: shortDesc,
                fullDescription: fullDesc,
                details: {},
                trackUrl: 'https://www.nhc.noaa.gov/',
                advisoryUrl: 'https://www.nhc.noaa.gov/',
                lastUpdate: new Date().toISOString()
              };
              
              // Extract wind speed if present
              const windMatch = line.match(/(\d+)\s*mph/i);
              if (windMatch) {
                currentStorm.details.windSpeed = `${windMatch[1]} mph`;
              }
              
              events.push(currentStorm);
            }
          }
        }
      }
    }
    
    // Parse severe alerts from response
    if (response.alerts?.content) {
      const alertText = response.alerts.content;
      const lines = alertText.split('\n');
      
      for (const line of lines) {
        // Look for heat wave mentions
        if (line.toLowerCase().includes('heat') && line.toLowerCase().includes('warning')) {
          const fullDesc = line.trim();
          const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
          events.push({
            type: 'heat',
            name: 'Heat Wave',
            location: extractLocation(line) || 'Multiple States',
            severity: 'Severe',
            description: shortDesc,
            fullDescription: fullDesc,
            details: {},
            lastUpdate: new Date().toISOString()
          });
        }
        
        // Look for flood mentions
        if (line.toLowerCase().includes('flood') && line.toLowerCase().includes('warning')) {
          const fullDesc = line.trim();
          const shortDesc = fullDesc.length > 100 ? fullDesc.substring(0, 100) + '...' : fullDesc;
          events.push({
            type: 'flood',
            name: 'Flood Warning',
            location: extractLocation(line) || 'Multiple Areas',
            severity: 'Severe',
            description: shortDesc,
            fullDescription: fullDesc,
            details: {},
            lastUpdate: new Date().toISOString()
          });
        }
      }
    }
    
    // Limit to top 6 most severe events
    return events.slice(0, 6);
  };

  const loadNationalSevereAlerts = async () => {
    if (loading) return;
    
    setLoading(true);
    
    // Set a timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      console.log('[Dashboard] National alerts loading timeout - falling back to major states');
      setLoading(false);
    }, 75000); // 75 second timeout
    
    try {
      console.log('[Dashboard] Loading national severe alerts...');
      
      // Try different location formats to get national alerts
      // Start with major regions/states that are likely to have alerts
      let response = null;
      const locationOptions = [
        'United States', // Try national first since we optimized it
        'Florida', 'Texas', 'California', 'Louisiana', 'North Carolina'
      ];
      
      for (const location of locationOptions) {
        try {
          console.log(`[Dashboard] Trying location: ${location}`);
          response = await api.getAlerts(location);
          if (response && response.alerts && response.alerts.length > 0) {
            console.log(`[Dashboard] Success with location: ${location}, found ${response.alerts.length} alerts`);
            break;
          }
        } catch (err) {
          console.log(`[Dashboard] Failed with location ${location}:`, err.message);
          continue;
        }
      }
      
      clearTimeout(timeoutId); // Clear timeout if we succeed
      
      if (response && response.alerts && response.alerts.length > 0) {
        console.log('[Dashboard] Raw alerts response:', response.alerts);
        
        // Sort alerts by severity and take top 3
        const sortedAlerts = response.alerts.sort((a, b) => {
          const severityOrder = { 'Extreme': 4, 'Severe': 3, 'Moderate': 2, 'Minor': 1, 'Unknown': 0 };
          const aSeverity = severityOrder[a.severity] || 0;
          const bSeverity = severityOrder[b.severity] || 0;
          console.log(`[Dashboard] Comparing ${a.event} (${a.severity}=${aSeverity}) vs ${b.event} (${b.severity}=${bSeverity})`);
          return bSeverity - aSeverity;
        });
        
        const topAlerts = sortedAlerts.slice(0, 3);
        setAlerts(topAlerts);
        
        // Use map_data markers if available, otherwise create default markers
        let markers = [];
        if (response.map_data) {
          console.log('[Dashboard] Map data structure:', response.map_data);
          
          // Check if map_data has markers array (new structure)
          if (response.map_data.markers && Array.isArray(response.map_data.markers) && response.map_data.markers.length > 0) {
            markers = response.map_data.markers.slice(0, 3); // Limit to top 3 to match alerts
            console.log('[Dashboard] Using backend map markers array:', markers);
          } 
          // Check if map_data is an object with location keys (alternative structure)
          else if (typeof response.map_data === 'object' && Object.keys(response.map_data).length > 0) {
            markers = Object.entries(response.map_data).slice(0, 3).map(([location, data]) => ({
              lat: data.lat || 39.8283,
              lng: data.lng || -98.5795,
              title: location,
              address: data.address || ''
            }));
            console.log('[Dashboard] Using backend map data object:', markers);
          }
        }
        
        // Fallback: create markers from alerts if no map data
        if (markers.length === 0) {
          markers = topAlerts.map((alert, index) => ({
            lat: 39.8283, // Default center of US
            lng: -98.5795,
            title: `${alert.event} - ${alert.severity}`,
            address: 'Location unavailable'
          }));
          console.log('[Dashboard] Using fallback markers (no coordinates):', markers);
        }
        
        setAlertMarkers(markers);
        
        console.log(`[Dashboard] Successfully loaded ${topAlerts.length} national severe alerts:`, topAlerts);
      } else {
        console.log('[Dashboard] No severe alerts found nationally - response:', response);
        setAlerts([]);
        setAlertMarkers([]);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load national severe alerts:', error);
      clearTimeout(timeoutId); // Clear timeout on error
      setAlerts([]);
      setAlertMarkers([]);
    } finally {
      setLoading(false);
    }
  };

  const extractLocation = (text) => {
    // Simple location extraction - look for state names
    const states = ['California', 'Texas', 'Florida', 'New York', 'Arizona', 'Nevada', 'Louisiana'];
    for (const state of states) {
      if (text.includes(state)) {
        return state;
      }
    }
    return null;
  };


  const handleFilterChange = (filterType, value) => {
    let displayName = value;
    if (filterType === 'region') {
      const region = regions.find(r => r.value === value);
      displayName = region?.displayName || value;
    }
    setSelectedFilter(filterType);
    setLocation(displayName);
    loadAlerts(displayName);
  };

  const handleStateSelect = (stateCode) => {
    setSelectedState(stateCode);
    setSelectedRegion(''); // Clear region when selecting individual state
    setIsDropdownOpen(false); // Close dropdown after selection
  };

  const handleApplyState = () => {
    if (!selectedState) {
      setAgentResponse('Please select a state');
      return;
    }
    
    setSelectedRegion(''); // Clear region selection when using custom state
    setSelectedFilter('state');
    setLocation(selectedState);
    setIsDropdownOpen(false); // Close dropdown after applying
    loadAlerts(selectedState);
  };

  const handleClearState = () => {
    setSelectedState('');
    setSelectedRegion('');
  };

  const handleSelectRegion = (regionName, regionStates) => {
    setSelectedRegion(regionName);
    setSelectedState(''); // Clear individual state selection
    setIsDropdownOpen(false); // Close dropdown
    
    // Trigger immediate search for the region
    setSelectedFilter('region');
    setLocation(regionStates);
    loadAlerts(regionStates);
  };

  const handleRefresh = () => {
    // Reset session to get fresh data
    api.resetSession();
    
    // Clear local state
    sessionStorage.removeItem('weatherAlerts');
    localStorage.removeItem('dashboardResponse');
    localStorage.removeItem('dashboardLocation');
    localStorage.removeItem('dashboardFilter');
    localStorage.removeItem('dashboardMarkers');
    localStorage.removeItem('dashboardMapCenter');
    localStorage.removeItem('dashboardSevereEvents');
    localStorage.removeItem('dashboardAlerts');
    setLocation('');
    setSelectedFilter('');
    setAlertMarkers([]);
    setMapCenter([39.8283, -98.5795]);
    setSevereEvents([]);
    setAlerts([]);
    setAgentResponse('');
    
    // Reload both severe weather events and national alerts
    loadSevereWeatherEvents();
    loadNationalSevereAlerts();
  };

  const quickActions = [
    { name: 'Get Forecast', icon: MagnifyingGlassIcon, href: '/forecast', color: 'bg-blue-500' },
    { name: 'Chat with Agent', icon: ExclamationTriangleIcon, href: '/chat', color: 'bg-red-500' },
    { name: 'Find Shelters', icon: MapPinIcon, href: '/emergency-resources', color: 'bg-green-500' },
    { name: 'Evacuation Routes', icon: MapIcon, href: '/emergency-resources', color: 'bg-purple-500' },
    { name: 'Risk Analysis', icon: ChartBarIcon, href: '/risk-analysis', color: 'bg-orange-500' },
    { name: 'Find Hospitals', icon: BuildingOffice2Icon, href: '/emergency-resources', color: 'bg-teal-500' },
  ];

  const regions = [
    { name: 'National', value: 'all US states', displayName: 'National', icon: '🇺🇸' },
    { name: 'West', value: 'CA,OR,WA,NV,AZ,ID,MT,WY,CO,UT,NM,AK,HI', displayName: 'Western US', icon: '🏔️' },
    { name: 'Midwest', value: 'IL,IN,IA,KS,MI,MN,MO,NE,ND,OH,SD,WI', displayName: 'Midwest US', icon: '🌾' },
    { name: 'South', value: 'AL,AR,DE,FL,GA,KY,LA,MD,MS,NC,OK,SC,TN,TX,VA,WV', displayName: 'Southern US', icon: '🌴' },
    { name: 'Northeast', value: 'CT,ME,MA,NH,NJ,NY,PA,RI,VT', displayName: 'Northeast US', icon: '🍂' },
  ];

  const allUSStates = [
    { code: 'AL', name: 'Alabama', region: 'South' },
    { code: 'AK', name: 'Alaska', region: 'West' },
    { code: 'AZ', name: 'Arizona', region: 'West' },
    { code: 'AR', name: 'Arkansas', region: 'South' },
    { code: 'CA', name: 'California', region: 'West' },
    { code: 'CO', name: 'Colorado', region: 'West' },
    { code: 'CT', name: 'Connecticut', region: 'Northeast' },
    { code: 'DE', name: 'Delaware', region: 'South' },
    { code: 'FL', name: 'Florida', region: 'South' },
    { code: 'GA', name: 'Georgia', region: 'South' },
    { code: 'HI', name: 'Hawaii', region: 'West' },
    { code: 'ID', name: 'Idaho', region: 'West' },
    { code: 'IL', name: 'Illinois', region: 'Midwest' },
    { code: 'IN', name: 'Indiana', region: 'Midwest' },
    { code: 'IA', name: 'Iowa', region: 'Midwest' },
    { code: 'KS', name: 'Kansas', region: 'Midwest' },
    { code: 'KY', name: 'Kentucky', region: 'South' },
    { code: 'LA', name: 'Louisiana', region: 'South' },
    { code: 'ME', name: 'Maine', region: 'Northeast' },
    { code: 'MD', name: 'Maryland', region: 'South' },
    { code: 'MA', name: 'Massachusetts', region: 'Northeast' },
    { code: 'MI', name: 'Michigan', region: 'Midwest' },
    { code: 'MN', name: 'Minnesota', region: 'Midwest' },
    { code: 'MS', name: 'Mississippi', region: 'South' },
    { code: 'MO', name: 'Missouri', region: 'Midwest' },
    { code: 'MT', name: 'Montana', region: 'West' },
    { code: 'NE', name: 'Nebraska', region: 'Midwest' },
    { code: 'NV', name: 'Nevada', region: 'West' },
    { code: 'NH', name: 'New Hampshire', region: 'Northeast' },
    { code: 'NJ', name: 'New Jersey', region: 'Northeast' },
    { code: 'NM', name: 'New Mexico', region: 'West' },
    { code: 'NY', name: 'New York', region: 'Northeast' },
    { code: 'NC', name: 'North Carolina', region: 'South' },
    { code: 'ND', name: 'North Dakota', region: 'Midwest' },
    { code: 'OH', name: 'Ohio', region: 'Midwest' },
    { code: 'OK', name: 'Oklahoma', region: 'South' },
    { code: 'OR', name: 'Oregon', region: 'West' },
    { code: 'PA', name: 'Pennsylvania', region: 'Northeast' },
    { code: 'RI', name: 'Rhode Island', region: 'Northeast' },
    { code: 'SC', name: 'South Carolina', region: 'South' },
    { code: 'SD', name: 'South Dakota', region: 'Midwest' },
    { code: 'TN', name: 'Tennessee', region: 'South' },
    { code: 'TX', name: 'Texas', region: 'South' },
    { code: 'UT', name: 'Utah', region: 'West' },
    { code: 'VT', name: 'Vermont', region: 'Northeast' },
    { code: 'VA', name: 'Virginia', region: 'South' },
    { code: 'WA', name: 'Washington', region: 'West' },
    { code: 'WV', name: 'West Virginia', region: 'South' },
    { code: 'WI', name: 'Wisconsin', region: 'Midwest' },
    { code: 'WY', name: 'Wyoming', region: 'West' },
    { code: 'DC', name: 'Washington DC', region: 'South' },
  ];

  return (
    <div className="space-y-6">
      <RiskAnalysisModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        analysis={riskAnalysis}
        isLoading={isAnalyzingRisk}
        alert={selectedAlertForAnalysis}
      />
      {/* Severe Weather Events Section */}
      {severeEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🌪️ Active Severe Weather Events</h2>
            <div className="flex items-center gap-3">
              {severeEvents.length > eventsPerPage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCarouselIndex(Math.max(0, carouselIndex - eventsPerPage))}
                    disabled={carouselIndex === 0}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {Math.floor(carouselIndex / eventsPerPage) + 1} / {Math.ceil(severeEvents.length / eventsPerPage)}
                  </span>
                  <button
                    onClick={() => setCarouselIndex(Math.min(severeEvents.length - eventsPerPage, carouselIndex + eventsPerPage))}
                    disabled={carouselIndex + eventsPerPage >= severeEvents.length}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                  </button>
                </div>
              )}
              <button
                onClick={loadSevereWeatherEvents}
                disabled={loadingEvents}
                className="text-sm text-primary hover:text-blue-900 font-medium disabled:opacity-50"
              >
                {loadingEvents ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {severeEvents.slice(carouselIndex, carouselIndex + eventsPerPage).map((event, index) => (
              <SevereWeatherCard key={carouselIndex + index} event={event} onAnalyzeRisk={handleAnalyzeRisk} />
            ))}
          </div>
          {severeEvents.length > eventsPerPage && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {carouselIndex + 1}-{Math.min(carouselIndex + eventsPerPage, severeEvents.length)} of {severeEvents.length} events
            </div>
          )}
        </div>
      )}

      {/* State Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🌍 Select Region or State for Weather Alerts</h2>
          {selectedState && (
            <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
              {allUSStates.find(s => s.code === selectedState)?.name || selectedState}
            </span>
          )}
        </div>
        
        {/* Quick Region Selectors */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Select by Region:</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => {
              const isSelected = selectedRegion === region.name;
              return (
                <button
                  key={region.name}
                  onClick={() => handleSelectRegion(region.name, region.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{region.icon}</span>
                  {region.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* State Single-Select Dropdown */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Or Select Individual State:</p>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  {!selectedState 
                    ? 'Select a state...' 
                    : allUSStates.find(s => s.code === selectedState)?.name || selectedState}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                {/* Search Box */}
                <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearchTerm}
                    onChange={(e) => setStateSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* State List */}
                <div className="overflow-y-auto max-h-64">
                  {allUSStates
                    .filter(state => 
                      state.name.toLowerCase().includes(stateSearchTerm.toLowerCase()) ||
                      state.code.toLowerCase().includes(stateSearchTerm.toLowerCase())
                    )
                    .map((state) => {
                      const isSelected = selectedState === state.code;
                      return (
                        <button
                          key={state.code}
                          onClick={() => handleStateSelect(state.code)}
                          className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{state.name}</div>
                              <div className="text-xs text-gray-500">{state.code} • {state.region}</div>
                            </div>
                            {isSelected && (
                              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApplyState}
            disabled={loading || !selectedState}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Loading Alerts...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Get Alerts for Selected State
              </>
            )}
          </button>
          <button
            onClick={handleClearState}
            disabled={!selectedState}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Clear
          </button>
        </div>

        {/* Selected State Display */}
        {selectedState && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Selected State:</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary text-white">
                {allUSStates.find(s => s.code === selectedState)?.name || selectedState}
                <button
                  onClick={handleClearState}
                  className="ml-2 hover:bg-blue-900 rounded-full p-0.5"
                >
                  ✕
                </button>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Active Alerts Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {alerts.length > 0 && !location ? '🚨 Severe Weather Alerts' : `Active Alerts${location && agentResponse ? ` - ${location}` : ''}`}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 text-primary hover:text-blue-900 text-sm font-medium disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert, index) => (
              <SevereWeatherCard key={index} event={alert} onAnalyzeRisk={handleAnalyzeRisk} />
            ))}
          </div>
        ) : agentResponse ? (
          <div className="text-center py-12 text-gray-500">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">{agentResponse}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">No Location Selected</p>
            <p className="text-sm text-gray-500">Please select a region, state, or enter a custom location to view active alerts.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Context Map with Alert Markers */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📍 {location || (alertMarkers && alertMarkers.length > 0 ? 'United States' : 'Select Location')} {alertMarkers && alertMarkers.length > 0 && `(${alertMarkers.length} Alert Zone${alertMarkers.length > 1 ? 's' : ''})`}
          </h2>
          <LocationMap 
            markers={alertMarkers}
            center={mapCenter}
            height="400px" 
          />
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> {alertMarkers && alertMarkers.length > 0 ? 'Red markers show areas with active weather alerts. Click markers for location details.' : 'Use the filters above to view alerts by region, state, or custom location.'}
              {' '}For emergency resources, use <strong>Emergency Resources</strong> to find shelters or hospitals.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <div className={`${action.color} p-2 rounded-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
