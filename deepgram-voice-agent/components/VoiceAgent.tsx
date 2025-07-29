'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { EnhancedAudioManager } from '@/lib/audioUtils';
import { DeepgramVoiceAgent, VoiceAgentMessage } from '@/lib/deepgram';
import { SessionStorage, ConversationMessage } from '@/lib/storage';
import { AudioVisualizer } from './AudioVisualizer';

interface VoiceAgentProps {
  onConversationUpdate: (conversation: ConversationMessage[]) => void;
}

export function VoiceAgent({ onConversationUpdate }: VoiceAgentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Ready to start');
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const audioManagerRef = useRef<AudioManager | null>(null);
  const enhancedAudioManagerRef = useRef<EnhancedAudioManager | null>(null);
  const deepgramRef = useRef<DeepgramVoiceAgent | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const conversationRef = useRef<ConversationMessage[]>([]);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const addMessage = useCallback((role: 'user' | 'agent', message: string) => {
    const newMessage: ConversationMessage = {
      id: generateId(),
      role,
      message,
      timestamp: new Date(),
    };
    
    conversationRef.current = [...conversationRef.current, newMessage];
    SessionStorage.setConversation(conversationRef.current);
    onConversationUpdate(conversationRef.current);
  }, [onConversationUpdate]);

  const updateAudioVisualization = useCallback(() => {
    if (audioManagerRef.current && isRecording) {
      const data = audioManagerRef.current.getAudioData();
      setAudioData(data);
      animationFrameRef.current = requestAnimationFrame(updateAudioVisualization);
    }
  }, [isRecording]);

  const handleDeepgramMessage = useCallback((message: VoiceAgentMessage, audioData?: ArrayBuffer) => {
    console.log('Handling Voice Agent message:', message);
    
    try {
      // Handle binary audio data from TTS
      if (message.type === 'audio' && audioData && deepgramRef.current) {
        deepgramRef.current.playAudio(audioData);
        return;
      }

      // Handle different Voice Agent message types from SDK
      switch (message.type) {
        case 'UserStartedSpeaking':
          setStatus('Listening...');
          setCurrentTranscript('');
          // Clear any ongoing audio playback when user interrupts
          if (deepgramRef.current) {
            deepgramRef.current.clearAudioBuffer();
          }
          break;
          
        case 'AgentThinking':
          setStatus('AI is thinking...');
          break;
          
        case 'AgentStartedSpeaking':
          setStatus('AI is speaking...');
          break;
          
        case 'AgentAudioDone':
          setStatus('Listening...');
          break;
          
        case 'ConversationText':
          if (message.channel?.alternatives?.[0]?.transcript) {
            const transcript = message.channel.alternatives[0].transcript;
            
            if (message.is_final) {
              if (transcript.trim()) {
                addMessage('user', transcript);
                setCurrentTranscript('');
                setStatus('Processing...');
              }
            } else {
              setCurrentTranscript(transcript);
            }
          }
          break;
          
        case 'Error':
          console.error('Voice Agent reported error:', message);
          setStatus('Error occurred');
          break;
          
        default:
          console.log('🔍 Unhandled message type:', message.type, 'Full message:', message);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error, 'Message:', message);
      setStatus('Message handling error');
    }
  }, [addMessage]);

  const startRecording = useCallback(async () => {
    try {
      setStatus('Requesting microphone permission...');
      
      // Debug: Check if API key is available
      console.log('Environment API key available:', !!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);
      
      // Use enhanced audio manager for better processing
      enhancedAudioManagerRef.current = new EnhancedAudioManager();
      const hasPermission = await enhancedAudioManagerRef.current.requestMicrophonePermission();
      
      if (!hasPermission) {
        setStatus('Microphone permission denied');
        return;
      }

      enhancedAudioManagerRef.current.setupAudioContext();
      
      // Keep original audio manager for visualization
      audioManagerRef.current = new AudioManager();
      await audioManagerRef.current.requestMicrophonePermission();
      audioManagerRef.current.setupAudioContext();
      
      setStatus('Connecting to Deepgram...');
      
      const settings = SessionStorage.getVoiceSettings();
      deepgramRef.current = new DeepgramVoiceAgent({
        settings,
      });

      const connected = await deepgramRef.current.connect();
      if (!connected) {
        setStatus('Failed to connect to Deepgram');
        return;
      }

      deepgramRef.current.onMessage(handleDeepgramMessage);
      
      // Start enhanced audio recording with direct audio processing
      const mediaRecorder = await enhancedAudioManagerRef.current.startRecording((audioData: ArrayBuffer) => {
        console.log('🎤 Audio captured:', audioData.byteLength, 'bytes');
        if (deepgramRef.current && audioData.byteLength > 0) {
          deepgramRef.current.sendAudio(audioData);
        } else if (audioData.byteLength === 0) {
          console.warn('⚠️ Empty audio data received');
        }
      });
      
      if (!mediaRecorder) {
        setStatus('Failed to start recording');
        return;
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Also start the original audio manager for visualization
      const visualizationRecorder = await audioManagerRef.current.startRecording();
      if (visualizationRecorder) {
        visualizationRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        visualizationRecorder.start(250);
      }
      setIsRecording(true);
      setIsConnected(true);
      setStatus('Listening...');
      
      updateAudioVisualization();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [handleDeepgramMessage, updateAudioVisualization]);

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (audioManagerRef.current) {
      audioManagerRef.current.stop();
    }

    if (enhancedAudioManagerRef.current) {
      enhancedAudioManagerRef.current.stop();
    }

    if (deepgramRef.current) {
      deepgramRef.current.disconnect();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsRecording(false);
    setIsConnected(false);
    setStatus('Recording stopped');
    setAudioData(null);
    setCurrentTranscript('');

    audioManagerRef.current = null;
    enhancedAudioManagerRef.current = null;
    deepgramRef.current = null;
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    // Load conversation from session storage
    const storedConversation = SessionStorage.getConversation();
    conversationRef.current = storedConversation;
    onConversationUpdate(storedConversation);

    return () => {
      stopRecording();
    };
  }, [onConversationUpdate]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Voice Interface
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {status}
        </p>
      </div>

      {/* Audio Visualizer */}
      <div className="mb-6">
        <AudioVisualizer 
          audioData={audioData} 
          isActive={isRecording}
        />
      </div>

      {/* Current Transcript */}
      {currentTranscript && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Speaking: {currentTranscript}
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Mic className="w-5 h-5" />
            <span>Start Conversation</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Square className="w-5 h-5" />
            <span>End Conversation</span>
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="mt-4 flex items-center justify-center space-x-2">
        <div 
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}