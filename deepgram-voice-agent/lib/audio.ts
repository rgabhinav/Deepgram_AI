export class AudioManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  setupAudioContext(): void {
    if (!this.mediaStream) return;

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.microphone.connect(this.analyser);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getAudioData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  async startRecording(): Promise<MediaRecorder | null> {
    if (!this.mediaStream) return null;

    const mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    return mediaRecorder;
  }

  stop(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
  }

  static calculateVolume(dataArray: Uint8Array): number {
    const sum = dataArray.reduce((acc, value) => acc + value, 0);
    return sum / dataArray.length / 255;
  }

  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}