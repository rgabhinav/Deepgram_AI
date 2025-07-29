export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: Date;
}

export interface VoiceSettings {
  language: string;
  model: string;
  ttsModel: string;
  sampleRate: number;
}

export const defaultVoiceSettings: VoiceSettings = {
  language: 'en-US',
  model: 'nova-2',
  ttsModel: 'aura-asteria-en',
  sampleRate: 16000,
};

export class SessionStorage {
  private static getKey(key: string): string {
    return `deepgram_voice_agent_${key}`;
  }

  static getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem(this.getKey('api_key')) || '';
  }

  static setApiKey(apiKey: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.getKey('api_key'), apiKey);
  }

  static getVoiceSettings(): VoiceSettings {
    if (typeof window === 'undefined') return defaultVoiceSettings;
    const stored = sessionStorage.getItem(this.getKey('voice_settings'));
    return stored ? JSON.parse(stored) : defaultVoiceSettings;
  }

  static setVoiceSettings(settings: VoiceSettings): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.getKey('voice_settings'), JSON.stringify(settings));
  }

  static getConversation(): ConversationMessage[] {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(this.getKey('conversation'));
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as Array<Omit<ConversationMessage, 'timestamp'> & { timestamp: string }>;
    return parsed.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  }

  static setConversation(conversation: ConversationMessage[]): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.getKey('conversation'), JSON.stringify(conversation));
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('deepgram_voice_agent_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}