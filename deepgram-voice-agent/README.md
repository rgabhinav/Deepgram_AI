# Deepgram Voice Agent Web App

A simple, modern web application that enables real-time voice conversations using Deepgram's Voice Agent API. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎤 **Real-time Voice Conversation**: Natural voice interaction with AI
- 🎵 **Audio Visualization**: Live waveform display during recording
- 💬 **Conversation History**: Session-based chat log with timestamps
- ⚙️ **Configurable Settings**: Customize language, voice models, and audio quality
- 🌙 **Dark Mode Support**: Automatic theme switching
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Privacy First**: No backend - all data stored in browser session

## Prerequisites

- Node.js 18+ 
- A Deepgram API key (get one at [console.deepgram.com](https://console.deepgram.com))

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd deepgram-voice-agent
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your Deepgram API key:
   # DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Start Talking**
   - Click "Start Conversation"
   - Allow microphone permissions
   - Begin speaking naturally - the AI will respond with voice!

## Configuration

### Voice Settings
- **Language**: Choose from 10+ supported languages
- **Speech-to-Text**: Select from Nova-2, Nova, Enhanced, or Base models
- **Text-to-Speech**: Pick from various Aura voices (male/female options)
- **Sample Rate**: Configure audio quality (8kHz to 48kHz)

### Supported Languages
- English (US/UK)
- Spanish, French, German, Italian
- Portuguese (Brazil)
- Japanese, Korean, Chinese (Simplified)

## Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Audio**: Web Audio API + MediaRecorder
- **WebSocket**: Native WebSocket for Deepgram connection
- **State**: React hooks with sessionStorage persistence

## How It Works

1. **Authentication**: Backend securely manages Deepgram API keys
2. **Audio Capture**: Uses MediaRecorder to capture microphone input  
3. **Real-time Streaming**: Sends audio chunks to Deepgram Voice Agent API via WebSocket
4. **AI Conversation**: Deepgram handles STT → LLM → TTS pipeline automatically
5. **Voice Playback**: Receives and plays synthesized speech responses
6. **Session Storage**: All conversation data stored locally in browser

## Browser Support

- Chrome/Chromium 66+
- Firefox 60+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **"Microphone permission denied"**
   - Check browser permissions
   - Ensure HTTPS connection (required for microphone access)

2. **"Failed to connect to Deepgram"**
   - Verify API key is correct in `.env.local`
   - Check internet connection
   - Ensure API key has Voice Agent permissions
   - Restart the development server after changing environment variables

3. **Poor audio quality**
   - Try different sample rates in settings
   - Check microphone hardware
   - Reduce background noise

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── VoiceAgent.tsx     # Main voice interface
│   ├── AudioVisualizer.tsx # Waveform display
│   ├── ConversationLog.tsx # Chat history
│   └── SettingsPanel.tsx  # Configuration panel
└── lib/
    ├── audio.ts           # Audio management utilities
    ├── deepgram.ts        # Deepgram API integration
    └── storage.ts         # Session storage helpers
```

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues with:
- **This app**: Open a GitHub issue
- **Deepgram API**: Check [Deepgram documentation](https://developers.deepgram.com/docs/voice-agent)

---

Built with ❤️ using Deepgram Voice Agent API