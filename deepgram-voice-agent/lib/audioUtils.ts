/**
 * Audio processing utilities based on official Deepgram Voice Agent demo
 */

export class AudioProcessor {
  /**
   * Convert Float32Array to Int16Array for Deepgram compatibility
   * @param float32Array Input float32 audio data
   * @returns Int16Array suitable for Deepgram
   */
  static convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    // Match official demo exactly - returns ArrayBuffer, not Int16Array
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7fff;
    }
    return buf.buffer;
  }

  /**
   * Downsample audio buffer from one sample rate to another
   * @param buffer Input audio buffer
   * @param inputSampleRate Original sample rate
   * @param outputSampleRate Target sample rate
   * @returns Downsampled audio buffer
   */
  static downsample(buffer: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return buffer;
    }
    const sampleRateRatio = fromSampleRate / toSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0,
        count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Convert Int16Array to ArrayBuffer for WebSocket transmission
   * @param int16Array Input int16 audio data
   * @returns ArrayBuffer ready for transmission
   */
  static int16ArrayToArrayBuffer(int16Array: Int16Array): ArrayBuffer {
    // Return the buffer directly like official demo
    return int16Array.buffer.slice(0) as ArrayBuffer;
  }

  /**
   * Process audio data from MediaRecorder for Deepgram Voice Agent
   * This combines the conversion and formatting steps
   * @param audioBuffer Raw audio buffer from MediaRecorder
   * @param inputSampleRate Current sample rate
   * @param targetSampleRate Target sample rate (typically 16000 for Deepgram)
   * @returns ArrayBuffer ready for Deepgram
   */
  static processAudioForDeepgram(
    audioBuffer: AudioBuffer,
    inputSampleRate: number,
    targetSampleRate: number = 16000
  ): ArrayBuffer {
    // Get the raw audio data (assuming mono channel)
    const channelData = audioBuffer.getChannelData(0);
    
    // Downsample if necessary
    const downsampledData = this.downsample(channelData, inputSampleRate, targetSampleRate);
    
    // Convert to Int16 and return ArrayBuffer directly
    return this.convertFloat32ToInt16(downsampledData);
  }

  /**
   * Create a silent audio buffer to send as keep-alive
   * @param durationMs Duration in milliseconds
   * @param sampleRate Sample rate
   * @returns ArrayBuffer with silence
   */
  static createSilentBuffer(durationMs: number, sampleRate: number = 16000): ArrayBuffer {
    const samples = Math.floor((durationMs / 1000) * sampleRate);
    const int16Array = new Int16Array(samples);
    // int16Array is already filled with zeros (silence)
    return this.int16ArrayToArrayBuffer(int16Array);
  }

  /**
   * Validate audio data before sending
   * @param data Audio data to validate
   * @returns true if data is valid
   */
  static validateAudioData(data: ArrayBuffer): boolean {
    return data instanceof ArrayBuffer && data.byteLength > 0;
  }
}

/**
 * Enhanced AudioManager with proper audio processing
 */
export class EnhancedAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false
        }
      });
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  setupAudioContext(): void {
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async startRecording(onAudioData: (audioData: ArrayBuffer) => void): Promise<MediaRecorder | null> {
    if (!this.mediaStream || !this.audioContext) {
      console.error('Audio not properly initialized');
      return null;
    }

    try {
      // Create audio source and processor for real-time processing
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Get the actual sample rate from the audio context
        const inputSampleRate = this.audioContext!.sampleRate;
        console.log('🎤 Actual input sample rate:', inputSampleRate);
        
        // Downsample to 16000Hz as required by Deepgram
        const downsampledData = AudioProcessor.downsample(inputData, inputSampleRate, 16000);
        const audioDataToSend = AudioProcessor.convertFloat32ToInt16(downsampledData);
        
        console.log('🔧 Audio processing:');
        console.log('  - Input size:', inputData.length);
        console.log('  - Downsampled size:', downsampledData.length);
        console.log('  - Buffer size:', audioDataToSend.byteLength, 'bytes');
        console.log('  - Buffer type:', Object.prototype.toString.call(audioDataToSend));
        
        // Debug: Check the raw bytes being sent
        const view = new Uint8Array(audioDataToSend);
        console.log('  - First 16 bytes:', Array.from(view.slice(0, 16)));
        
        if (AudioProcessor.validateAudioData(audioDataToSend)) {
          onAudioData(audioDataToSend);
        } else {
          console.warn('❌ Audio data validation failed');
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Also create MediaRecorder for backup/compatibility
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      return this.mediaRecorder;
    } catch (error) {
      console.error('Error starting recording:', error);
      return null;
    }
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getAudioData(): Uint8Array | null {
    // This would be implemented for visualization purposes
    // For now, return null as it's not critical for the Voice Agent functionality
    return null;
  }
}