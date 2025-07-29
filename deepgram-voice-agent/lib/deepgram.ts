import { DeepgramClient } from '@deepgram/sdk';
import { VoiceSettings } from './storage';

export interface DeepgramVoiceAgentConfig {
  settings: VoiceSettings;
}

export interface VoiceAgentMessage {
  type: string;
  user_id?: string;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
    }>;
  };
  speech_final?: boolean;
  is_final?: boolean;
  function_call?: {
    name: string;
    arguments: unknown;
  };
}

export interface AuthToken {
  token: string;
  expires_at: string;
}

export class DeepgramVoiceAgent {
  private deepgramClient: DeepgramClient | null = null;
  private socket: WebSocket | null = null;
  private config: DeepgramVoiceAgentConfig;
  private isConnected = false;
  private settingsApplied = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private authToken: string | null = null;
  private audioContext: AudioContext | null = null;
  private messageCallback: ((message: VoiceAgentMessage, audioData?: ArrayBuffer) => void) | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private lastAudioSent = 0;
  private startTime = -1;
  private scheduledAudioSources: AudioBufferSourceNode[] = [];

  constructor(config: DeepgramVoiceAgentConfig) {
    this.config = config;
  }

  private async getAuthToken(): Promise<string> {
    // Always get fresh token (don't cache for testing)
    // if (this.authToken) {
    //   console.log('Using cached auth token');
    //   return this.authToken;
    // }

    // FORCE using API endpoint to get JWT token (don't use client-side API key)
    // This ensures we get proper JWT token instead of raw API key
    console.log('🔑 Getting JWT token from authentication API...');
    
    try {
      const response = await fetch('/api/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Authentication response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Authentication failed:', response.status, errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const token = data.access_token;
      
      console.log('✅ Authentication successful!');
      console.log('Token type:', token?.startsWith('eyJ') ? 'JWT Token' : 'Raw API Key');
      console.log('Token preview:', token?.substring(0, 20) + '...');
      
      if (!token) {
        throw new Error('No access_token in authentication response');
      }
      
      this.authToken = token;
      return token;
      
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
      throw error;
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      const token = await this.getAuthToken();
      
      return new Promise((resolve, reject) => {
        // Set a timeout for the connection attempt
        const connectionTimeout = setTimeout(() => {
          console.error('Connection attempt timed out');
          reject(new Error('Voice Agent connection timed out'));
        }, 10000); // 10 second timeout

        // Create WebSocket connection using official pattern
        console.log('Creating WebSocket connection to Deepgram Voice Agent...');
        this.socket = new WebSocket("wss://agent.deepgram.com/v1/agent/converse", [
          "bearer",
          token
        ]);
        
        this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener("open", () => {
          console.log('Voice Agent connection opened');
          this.isConnected = true;
          this.startKeepAlive();
          // Send configuration immediately after connection opens
          setTimeout(() => {
            this.sendConfiguration();
            this.lastAudioSent = Date.now();
          }, 100);
          clearTimeout(connectionTimeout);
          resolve(true);
        });

        this.socket.addEventListener("error", (error) => {
          console.error('Voice Agent WebSocket error:', error);
          console.error('Error details:', {
            type: error.type,
            target: (error.target as WebSocket)?.readyState,
            url: (error.target as WebSocket)?.url,
            protocol: (error.target as WebSocket)?.protocol
          });
          this.isConnected = false;
          clearTimeout(connectionTimeout);
          reject(new Error(`Voice Agent connection failed: ${error.type || 'Unknown error'}`));
        });

        this.socket.addEventListener("close", (event) => {
          console.log('Voice Agent connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.stopKeepAlive();
          if (event.code !== 1000) { // Normal closure
            console.log('Attempting to reconnect due to abnormal close...');
            this.attemptReconnect();
          }
        });

        this.socket.addEventListener("message", (event) => {
          this.handleMessage(event);
        });
      });
      
    } catch (error) {
      console.error('Failed to connect to Deepgram Voice Agent:', error);
      return false;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Handle binary audio data (TTS responses)
      if (event.data instanceof ArrayBuffer) {
        console.log('🎵 Audio data received:', event.data.byteLength, 'bytes');
        if (this.messageCallback) {
          this.messageCallback({ type: 'audio' }, event.data);
        }
        return;
      }

      // Handle JSON messages
      const message = JSON.parse(event.data);
      console.log('📨 Voice Agent message:', JSON.stringify(message, null, 2));

      switch (message.type) {
        case 'Welcome':
          console.log('Welcome message received');
          break;
        
        case 'SettingsApplied':
          console.log('Settings applied');
          this.settingsApplied = true;
          break;

        case 'ConversationText':
          if (this.messageCallback) {
            this.messageCallback({
              type: 'ConversationText',
              channel: {
                alternatives: [{
                  transcript: message.text || message.transcript || ''
                }]
              },
              is_final: message.is_final || false
            });
          }
          break;

        case 'UserStartedSpeaking':
          console.log('User started speaking');
          if (this.messageCallback) {
            this.messageCallback({ type: 'UserStartedSpeaking' });
          }
          break;

        case 'AgentThinking':
          console.log('Agent thinking');
          if (this.messageCallback) {
            this.messageCallback({ type: 'AgentThinking' });
          }
          break;

        case 'AgentStartedSpeaking':
          console.log('Agent started speaking');
          if (this.messageCallback) {
            this.messageCallback({ type: 'AgentStartedSpeaking' });
          }
          break;

        case 'AgentAudioDone':
          console.log('Agent audio done');
          if (this.messageCallback) {
            this.messageCallback({ type: 'AgentAudioDone' });
          }
          break;

        case 'Error':
          console.error('Voice Agent error:', message);
          if (this.messageCallback) {
            this.messageCallback({ type: 'Error', ...message });
          }
          break;

        default:
          console.log('Unhandled message type:', message.type);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error, 'Raw data:', event.data);
    }
  }

  private sendConfiguration(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Configure the Voice Agent using WebSocket message (matching official demo format)
    const config = {
      type: 'Settings',
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: 16000,
        },
        output: {
          encoding: 'linear16',
          sample_rate: 24000,
          container: 'none',
        },
      },
      agent: {
        listen: {
          provider: {
            type: 'deepgram',
            model: this.config.settings.model || 'nova-3',
          },
        },
        think: {
          provider: {
            type: 'open_ai',
            model: 'gpt-4o-mini',
          },
          prompt: `
            ## Base instructions
            You are a helpful voice assistant made by Deepgram's engineers.
            Respond in a friendly, human, conversational manner.
            YOU MUST answer in 1-2 sentences at most when the message is not empty.
            Always reply to empty messages with an empty message.
            Ask follow up questions.
            Ask one question at a time.
            Your messages should have no more than than 120 characters.
            Do not use abbreviations for units.
            Separate all items in a list with commas.
            Keep responses unique and free of repetition.
            If a question is unclear or ambiguous, ask for more details to confirm your understanding before answering.
            If someone asks how you are, or how you are feeling, tell them.
            Deepgram gave you a mouth and ears so you can take voice as an input. You can listen and speak.
            Your name is Voicebot.
          `,
          functions: [],
        },
        speak: {
          provider: {
            type: 'deepgram',
            model: this.config.settings.ttsModel || 'aura-asteria-en',
          },
        },
      },
      experimental: true,
    };

    console.log('Configuring Voice Agent:', config);
    this.socket.send(JSON.stringify(config));
  }

  onMessage(callback: (message: VoiceAgentMessage, audioData?: ArrayBuffer) => void): void {
    this.messageCallback = callback;
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.settingsApplied) {
      try {
        console.log('📤 Attempting to send audio data:', audioData.byteLength, 'bytes');
        
        // Debug: Check if this is a valid ArrayBuffer
        if (!(audioData instanceof ArrayBuffer)) {
          console.error('❌ Data is not ArrayBuffer:', typeof audioData, audioData);
          return;
        }
        
        // Debug: Show detailed buffer info
        const preview = new Uint8Array(audioData, 0, Math.min(16, audioData.byteLength));
        console.log('📤 Buffer details:');
        console.log('  - ByteLength:', audioData.byteLength);
        console.log('  - First 16 bytes:', Array.from(preview));
        console.log('  - WebSocket ready state:', this.socket.readyState);
        console.log('  - WebSocket binary type:', this.socket.binaryType);
        
        this.socket.send(audioData);
        console.log('✅ Audio data sent successfully');
        this.lastAudioSent = Date.now();
      } catch (error) {
        console.error('❌ Error sending audio data:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        // Attempt to reconnect on send failure
        this.attemptReconnect();
      }
    } else if (this.isConnected && !this.settingsApplied) {
      console.warn('⏳ Skipping audio send - settings not yet applied');
    } else {
      console.warn('❌ Cannot send audio - connection not ready (connected:', this.isConnected, 'settings:', this.settingsApplied, 'socket state:', this.socket?.readyState, ')');
    }
  }

  sendKeepAlive(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        // Send KeepAlive message as per official demo
        const keepAliveMessage = { type: 'KeepAlive' };
        this.socket.send(JSON.stringify(keepAliveMessage));
      } catch (error) {
        console.error('Error sending keep-alive:', error);
      }
    }
  }

  private startKeepAlive(): void {
    // Clear any existing interval
    this.stopKeepAlive();
    
    // Send keep-alive every 10 seconds as per official demo
    this.keepAliveInterval = setInterval(() => {
      const timeSinceLastAudio = Date.now() - this.lastAudioSent;
      
      // Only send keep-alive if we haven't sent audio recently
      if (timeSinceLastAudio > 8000) { // 8 seconds
        console.log('Sending keep-alive to prevent timeout');
        this.sendKeepAlive();
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  clearAudioBuffer(): void {
    // Stop all scheduled audio sources
    this.scheduledAudioSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source already stopped
      }
    });
    this.scheduledAudioSources = [];
    this.startTime = -1;
    console.log('Cleared audio buffer');
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('Received audio data:', audioData.byteLength, 'bytes');

      // Create audio buffer from PCM data
      const audioDataView = new Int16Array(audioData);
      if (audioDataView.length === 0) {
        console.error("Received audio data is empty.");
        return;
      }

      // Deepgram sends 24kHz audio
      const sampleRate = 24000;
      const buffer = this.audioContext.createBuffer(1, audioDataView.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Convert linear16 PCM to float [-1, 1]
      for (let i = 0; i < audioDataView.length; i++) {
        channelData[i] = audioDataView[i] / 32768;
      }

      // Schedule audio playback sequentially
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      const currentTime = this.audioContext.currentTime;
      if (this.startTime < currentTime) {
        this.startTime = currentTime;
      }
      
      source.start(this.startTime);
      this.startTime += buffer.duration;
      
      // Track scheduled sources so we can stop them if needed
      this.scheduledAudioSources.push(source);
      
      // Clean up finished sources
      source.onended = () => {
        const index = this.scheduledAudioSources.indexOf(source);
        if (index > -1) {
          this.scheduledAudioSources.splice(index, 1);
        }
      };
      
      console.log('Scheduled audio playback at', this.startTime - buffer.duration, 'for', buffer.duration, 'seconds');
    } catch (error) {
      console.error('Error playing audio:', error);
      console.error('Audio data info:', {
        byteLength: audioData.byteLength,
        first16Bytes: Array.from(new Uint8Array(audioData.slice(0, 16)))
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        // Clear auth token and reset flags to get a fresh connection
        this.authToken = null;
        this.settingsApplied = false;
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    // Stop keep-alive first
    this.stopKeepAlive();
    
    if (this.socket) {
      try {
        this.socket.close(1000, 'Normal closure');
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      this.socket = null;
    }
    if (this.deepgramClient) {
      this.deepgramClient = null;
    }
    this.isConnected = false;
    this.settingsApplied = false;
    this.authToken = null;
  }

  isConnectedToService(): boolean {
    return this.isConnected && this.socket !== null;
  }

  updateConfig(config: DeepgramVoiceAgentConfig): void {
    this.config = config;
    if (this.isConnected) {
      this.disconnect();
    }
  }

  isReadyForAudio(): boolean {
    return this.isConnected && this.settingsApplied;
  }
}