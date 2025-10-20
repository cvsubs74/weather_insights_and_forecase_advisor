import React from 'react';

const MapEmbed = ({ mapUrl, height = '400px' }) => {
  if (!mapUrl) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-gray-500">No map data available</p>
      </div>
    );
  }

  // Convert regular Google Maps URL to Embed API format
  const getEmbedUrl = (url) => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      // Extract query parameter from URL
      const urlObj = new URL(url);
      const query = urlObj.searchParams.get('query');
      
      if (query) {
        // Use place mode for single location searches
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}&zoom=12`;
      }
      
      // Fallback: try to extract location from URL path
      const pathMatch = url.match(/search\/([^@]+)@/);
      if (pathMatch) {
        return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(pathMatch[1])}&zoom=12`;
      }
      
      // Default: show California
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=California&zoom=6`;
    } catch (error) {
      console.error('Error converting to embed URL:', error);
      return null;
    }
  };

  const embedUrl = getEmbedUrl(mapUrl);

  if (!embedUrl) {
    // Fallback: show a link to open in Google Maps
    return (
      <div 
        className="bg-gray-100 rounded-lg flex flex-col items-center justify-center p-6"
        style={{ height }}
      >
        <p className="text-gray-600 mb-4">Unable to embed map</p>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-md bg-gray-50" style={{ height }}>
      <div className="h-full flex flex-col">
        <div className="flex-1 relative">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={embedUrl}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps"
          />
        </div>
        <div className="p-3 bg-white border-t border-gray-200">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Maps (Full View with All Markers)
          </a>
        </div>
      </div>
    </div>
  );
};

export default MapEmbed;
