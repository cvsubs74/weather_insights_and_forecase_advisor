import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom red marker for emergency locations
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map view changes and bounds fitting
function MapController({ center, zoom, markers }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers && markers.length > 1) {
      // If we have multiple markers, fit bounds to show all markers
      const bounds = L.latLngBounds(markers.map(marker => [marker.lat, marker.lng]));
      map.fitBounds(bounds, { 
        padding: [20, 20], // Add padding around the bounds
        maxZoom: 12 // Don't zoom in too much
      });
    } else if (markers && markers.length === 1) {
      // Single marker - center on it with reasonable zoom
      map.setView([markers[0].lat, markers[0].lng], 10);
    } else if (center) {
      // Fallback to provided center and zoom
      map.setView(center, zoom);
    }
  }, [center, zoom, markers, map]);
  
  return null;
}

const LocationMap = ({ center, markers = [], height = '450px' }) => {
  // Default center - will be overridden by MapController based on markers
  const defaultCenter = center || [37.7749, -122.4194]; // Default to SF
  const defaultZoom = 12;

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden shadow-md">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={defaultZoom} markers={markers} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Plot all markers */}
        {markers && markers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.lat, marker.lng]}
            icon={redIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-900 mb-1">{marker.title}</h3>
                {marker.address && (
                  <p className="text-sm text-gray-600 mb-2">{marker.address}</p>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Get Directions →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
