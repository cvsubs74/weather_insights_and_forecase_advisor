import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
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
        content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n\nWhat would you like to know?',
        timestamp: new Date(),
        mapUrl: null,
        mapMarkers: [],
        mapCenter: null
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.query(input);
      
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
            .replace(/\[View map\]\(https:\/\/www\.google\.com\/maps[^\)]+\)/gi, '')
            .replace(/https:\/\/www\.google\.com\/maps[^\s)]+/g, '')
            .replace(/\n\n+/g, '\n\n')
            .trim();
        }
        
        // Parse coordinates from response - pattern: "Name (lat, lng)"
        const locationPattern = /(\d+)\.\s*\*\*([^*]+)\*\*\s*\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/g;
        let match;
        
        while ((match = locationPattern.exec(response.content)) !== null) {
          const [, index, name, lat, lng] = match;
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

  const quickActions = [
    'What are the current weather alerts in California?',
    'Give me the 7-day forecast for Miami, FL',
    'Find emergency shelters near downtown Houston',
    'Show me evacuation routes from Tampa to Orlando'
  ];

  const handleQuickAction = (action) => {
    setInput(action);
  };

  const handleClearChat = () => {
    const welcomeMessage = {
      role: 'assistant',
      content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n\nWhat would you like to know?',
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
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-md font-semibold mb-2 mt-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-semibold mb-1 mt-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2 ml-2" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
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

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="bg-white border-t p-4">
          <p className="text-sm text-gray-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-b-lg shadow-md p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about weather, forecasts, alerts, or emergency planning..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
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
