'use client';

import { useEffect, useRef } from 'react';
import { User, Bot, Trash2 } from 'lucide-react';
import { ConversationMessage, SessionStorage } from '@/lib/storage';

interface ConversationLogProps {
  conversation: ConversationMessage[];
}

export function ConversationLog({ conversation }: ConversationLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const clearConversation = () => {
    if (confirm('Are you sure you want to clear the conversation history?')) {
      SessionStorage.setConversation([]);
      window.location.reload(); // Simple way to update the UI
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Conversation
        </h2>
        {conversation.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="space-y-4 max-h-96 overflow-y-auto pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {conversation.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Bot className="w-8 h-8 text-slate-400" />
            </div>
            <p>No conversation yet</p>
            <p className="text-sm mt-1">Start talking to see your conversation appear here</p>
          </div>
        ) : (
          conversation.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'agent' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                }`}
              >
                <p className="text-sm break-words">{message.message}</p>
                <p 
                  className={`text-xs mt-1 opacity-75 ${
                    message.role === 'user' 
                      ? 'text-green-100' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {conversation.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>{conversation.length} messages</span>
            <span>
              Started: {conversation[0] && formatTime(conversation[0].timestamp)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}