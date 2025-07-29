'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { SessionStorage, VoiceSettings, defaultVoiceSettings } from '@/lib/storage';

// Props interface is intentionally empty as component needs no external props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SettingsPanelProps {}

export function SettingsPanel({}: SettingsPanelProps) {
  const [settings, setSettings] = useState<VoiceSettings>(defaultVoiceSettings);

  useEffect(() => {
    // Load settings from session storage
    const storedSettings = SessionStorage.getVoiceSettings();
    setSettings(storedSettings);
  }, []);

  const handleSettingChange = (key: keyof VoiceSettings, value: string | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    SessionStorage.setVoiceSettings(newSettings);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Settings
        </h2>
      </div>

      <div className="space-y-6">
        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Voice Agent Configuration
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Configure your voice settings below. The application uses secure backend authentication for Deepgram API access.
          </p>
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Language
          </label>
          <select
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish (Spain)</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
            <option value="zh-CN">Chinese (Simplified)</option>
          </select>
        </div>

        {/* Speech-to-Text Model */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Speech-to-Text Model
          </label>
          <select
            value={settings.model}
            onChange={(e) => handleSettingChange('model', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="nova-2">Nova-2 (Latest)</option>
            <option value="nova">Nova</option>
            <option value="enhanced">Enhanced</option>
            <option value="base">Base</option>
          </select>
        </div>

        {/* Text-to-Speech Model */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Text-to-Speech Voice
          </label>
          <select
            value={settings.ttsModel}
            onChange={(e) => handleSettingChange('ttsModel', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="aura-asteria-en">Asteria (Female)</option>
            <option value="aura-luna-en">Luna (Female)</option>
            <option value="aura-stella-en">Stella (Female)</option>
            <option value="aura-athena-en">Athena (Female)</option>
            <option value="aura-hera-en">Hera (Female)</option>
            <option value="aura-orion-en">Orion (Male)</option>
            <option value="aura-arcas-en">Arcas (Male)</option>
            <option value="aura-perseus-en">Perseus (Male)</option>
            <option value="aura-angus-en">Angus (Male)</option>
            <option value="aura-orpheus-en">Orpheus (Male)</option>
          </select>
        </div>

        {/* Sample Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Audio Sample Rate
          </label>
          <select
            value={settings.sampleRate}
            onChange={(e) => handleSettingChange('sampleRate', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={8000}>8 kHz</option>
            <option value={16000}>16 kHz (Recommended)</option>
            <option value={22050}>22.05 kHz</option>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
          </select>
        </div>

        {/* Status Indicator */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">Backend Status:</span>
            <span className="font-medium text-green-600">
              Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            API authentication handled securely by the server
          </p>
        </div>
      </div>
    </div>
  );
}