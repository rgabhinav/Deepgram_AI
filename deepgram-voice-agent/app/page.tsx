'use client';

import { VoiceAgent } from '@/components/VoiceAgent';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ConversationLog } from '@/components/ConversationLog';
import { useState } from 'react';

export default function Home() {
  const [conversation, setConversation] = useState<Array<{
    id: string;
    role: 'user' | 'agent';
    message: string;
    timestamp: Date;
  }>>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Deepgram Voice Agent
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            AI-powered conversation using voice
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <SettingsPanel />
          </div>

          {/* Voice Agent Interface */}
          <div className="lg:col-span-1">
            <VoiceAgent 
              onConversationUpdate={setConversation}
            />
          </div>

          {/* Conversation Log */}
          <div className="lg:col-span-1">
            <ConversationLog conversation={conversation} />
          </div>
        </div>
      </div>
    </div>
  );
}