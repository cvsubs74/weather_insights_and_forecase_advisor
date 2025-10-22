import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { UserIcon, CloudIcon } from '@heroicons/react/24/outline';
import LocationMap from '../components/LocationMap';
import api from '../services/api';

const Chat = () => {
  // Load messages from localStorage or use default welcome message
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }
    return [
      {
        role: 'assistant',
        content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n- **Hurricane path image analysis** (upload hurricane forecast maps)\n\nWhat would you like to know?',
        timestamp: new Date(),
        mapUrl: null,
        mapMarkers: [],
        mapCenter: null
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [suggestedActions, setSuggestedActions] = useState([
    'What are the current weather alerts in California?',
    'Give me the 7-day forecast for Miami, FL',
    'Find emergency shelters near Houston',
    'Show me evacuation routes from Tampa to Orlando'
  ]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save messages to localStorage whenever they change (excluding images to avoid quota issues)
  useEffect(() => {
    const messagesToSave = messages.map(msg => ({
      ...msg,
      image: undefined // Don't save images to localStorage to avoid quota exceeded
    }));
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
    } catch (e) {
      console.error('Failed to save messages to localStorage:', e);
      // If still failing, clear old messages
      if (e.name === 'QuotaExceededError') {
        localStorage.removeItem('chatMessages');
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[Chat] Session expired, clearing chat history');
      // Reset to welcome message
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n\nWhat would you like to know?',
          timestamp: new Date(),
          mapUrl: null,
          mapMarkers: [],
          mapCenter: null
        }
      ]);
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage = {
      role: 'user',
      content: input || 'Analyze this hurricane path image and perform risk assessment',
      timestamp: new Date(),
      image: imagePreview
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLoading(true);

    try {
      // Use appropriate API method based on whether there's an image
      const response = currentImage 
        ? await api.queryWithImage(currentInput || 'Analyze this hurricane path image and perform risk assessment', currentImage)
        : await api.query(currentInput);
      
      // Extract map URL and coordinates from response
      let mapUrl = null;
      let mapMarkers = [];
      let mapCenter = null;
      let content = response.content || 'I apologize, but I encountered an error processing your request.';
      
      if (content) {
        // Extract map URL
        const mapUrlMatch = content.match(/https:\/\/www\.google\.com\/maps[^\s)]+/);
        if (mapUrlMatch) {
          mapUrl = mapUrlMatch[0];
          // Remove the map URL from content
          content = content
            .replace(/View map:\s*\[?https:\/\/www\.google\.com\/maps[^\s)\]]+\]?/gi, '')
            .replace(/\[View map\]\(https:\/\/www\.google\.com\/maps[^)]+\)/gi, '')
            .replace(/https:\/\/www\.google\.com\/maps[^\s)]+/g, '')
            .replace(/\n\n+/g, '\n\n')
            .trim();
        }
        
        // Parse coordinates from response - pattern: "Name (lat, lng)"
        const locationPattern = /(\d+)\.\s*\*\*([^*]+)\*\*\s*\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/g;
        let match;
        
        while ((match = locationPattern.exec(response.content)) !== null) {
          const [, , name, lat, lng] = match;
          mapMarkers.push({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            title: name.trim(),
            address: ''
          });
        }
        
        // Set center to first marker if markers exist
        if (mapMarkers.length > 0) {
          mapCenter = [mapMarkers[0].lat, mapMarkers[0].lng];
        }
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: content,
        timestamp: new Date(),
        mapUrl: mapUrl,
        mapMarkers: mapMarkers,
        mapCenter: mapCenter
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Generate contextual suggestions based on the conversation
      if (currentInput && content) {
        setLoadingSuggestions(true);
        try {
          const suggestions = await api.getSuggestedActions(currentInput, content);
          if (suggestions && suggestions.length > 0) {
            setSuggestedActions(suggestions);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        mapUrl: null,
        mapMarkers: [],
        mapCenter: null
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };


  const handleQuickAction = (action) => {
    setInput(action);
    // Auto-submit if it's a complete question
    if (action.endsWith('?') || action.includes('Show') || action.includes('Find') || action.includes('Get')) {
      // Trigger form submission after a brief delay to allow state update
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
    }
  };

  const handleClearChat = () => {
    const welcomeMessage = {
      role: 'assistant',
      content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n- **Hurricane path image analysis** (upload hurricane forecast maps)\n\nWhat would you like to know?',
      timestamp: new Date(),
      mapUrl: null,
      mapMarkers: [],
      mapCenter: null
    };
    setMessages([welcomeMessage]);
    localStorage.setItem('chatMessages', JSON.stringify([welcomeMessage]));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat Header */}
      <div className="bg-white rounded-t-lg shadow-md p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <CloudIcon className="h-6 w-6 mr-2 text-primary" />
              Weather Advisor Chat
            </h2>
            <p className="text-sm text-gray-600 mt-1">Ask me anything about weather, forecasts, and emergency planning</p>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-primary' : 'bg-gray-300'
                }`}>
                  {message.role === 'user' ? (
                    <UserIcon className="h-5 w-5 text-white" />
                  ) : (
                    <CloudIcon className="h-5 w-5 text-gray-700" />
                  )}
                </div>
              </div>

              {/* Message Bubble */}
              <div className="space-y-3">
                <div
                  className={`rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div>
                      {message.image && (
                        <div className="mb-3">
                          <img 
                            src={message.image} 
                            alt="Uploaded" 
                            className="max-w-sm rounded-lg border-2 border-white shadow-lg"
                          />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        h1: ({node, children, ...props}) => <h1 className="text-lg font-bold mb-2" {...props}>{children}</h1>,
                        h2: ({node, children, ...props}) => <h2 className="text-md font-semibold mb-2 mt-3" {...props}>{children}</h2>,
                        h3: ({node, children, ...props}) => <h3 className="text-sm font-semibold mb-1 mt-2" {...props}>{children}</h3>,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2 ml-2" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
                        a: ({node, children, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {/* Embedded Map with Markers */}
                {message.role === 'assistant' && (message.mapMarkers?.length > 0 || message.mapUrl) && (
                  <div className="rounded-lg overflow-hidden shadow-md">
                    {message.mapMarkers?.length > 0 ? (
                      <div>
                        <div className="bg-gray-100 px-3 py-2 text-sm text-gray-700 font-medium">
                          📍 {message.mapMarkers.length} Location{message.mapMarkers.length > 1 ? 's' : ''} Found
                        </div>
                        <LocationMap 
                          center={message.mapCenter}
                          markers={message.mapMarkers}
                          height="350px" 
                        />
                      </div>
                    ) : message.mapUrl ? (
                      <div>
                        <div className="bg-gray-100 px-3 py-2 text-sm text-gray-700 font-medium">
                          📍 Map View
                        </div>
                        <iframe
                          width="100%"
                          height="300px"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={message.mapUrl}
                          allowFullScreen
                          loading="lazy"
                          title="Map"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-3xl">
              <div className="mr-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <CloudIcon className="h-5 w-5 text-gray-700" />
                </div>
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Contextual Quick Actions - Always visible */}
      {!loading && (
        <div className="bg-white border-t p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">
              {messages.length === 1 ? '💡 Quick actions:' : '💡 Suggested follow-ups:'}
            </p>
            {loadingSuggestions && (
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                disabled={loadingSuggestions}
                className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg text-gray-700 transition-all border border-blue-200 hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-b-lg shadow-md p-4 border-t">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-xs rounded-lg border-2 border-gray-300 shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            <div className="mt-2 text-sm text-gray-600">
              📸 Hurricane path image ready for analysis
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            title="Upload hurricane path image"
          >
            <PhotoIcon className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedImage ? "Add message (optional)" : "Ask about weather, forecasts, alerts, or upload hurricane image..."}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedImage)}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            <span>Send</span>
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
