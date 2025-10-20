import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { UserIcon, CloudIcon } from '@heroicons/react/24/outline';
import MapEmbed from '../components/MapEmbed';
import api from '../services/api';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Weather Insights and Forecast Advisor. I can help you with:\n\n- Weather forecasts for any location\n- Active weather alerts\n- Emergency shelter locations\n- Evacuation routes\n- Risk analysis for severe weather\n- Historical weather data\n\nWhat would you like to know?',
      timestamp: new Date(),
      mapUrl: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      
      // Extract map URL from response if present and remove it from text
      let mapUrl = null;
      let content = response.content || 'I apologize, but I encountered an error processing your request.';
      
      if (content) {
        const mapUrlMatch = content.match(/https:\/\/www\.google\.com\/maps[^\s)]+/);
        if (mapUrlMatch) {
          mapUrl = mapUrlMatch[0];
          // Remove the map URL and any surrounding text like "View map:" or markdown link
          content = content
            .replace(/View map:\s*\[?https:\/\/www\.google\.com\/maps[^\s)\]]+\]?/gi, '')
            .replace(/\[View map\]\(https:\/\/www\.google\.com\/maps[^\)]+\)/gi, '')
            .replace(/https:\/\/www\.google\.com\/maps[^\s)]+/g, '')
            .replace(/\n\n+/g, '\n\n') // Clean up extra newlines
            .trim();
        }
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: content,
        timestamp: new Date(),
        mapUrl: mapUrl
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        mapUrl: null
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat Header */}
      <div className="bg-white rounded-t-lg shadow-md p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <CloudIcon className="h-6 w-6 mr-2 text-primary" />
          Weather Advisor Chat
        </h2>
        <p className="text-sm text-gray-600 mt-1">Ask me anything about weather, forecasts, and emergency planning</p>
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
                
                {/* Embedded Map */}
                {message.role === 'assistant' && message.mapUrl && (
                  <div className="rounded-lg overflow-hidden shadow-md">
                    <MapEmbed mapUrl={message.mapUrl} height="300px" />
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
