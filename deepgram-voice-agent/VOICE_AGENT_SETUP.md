# Voice Agent Setup Issue - 401 Unauthorized

## Problem Identified ❌
Your WebSocket connection to Deepgram Voice Agent is failing with a **401 Unauthorized** error.

## Root Cause 🔍
The Deepgram API key in your `.env.local` file doesn't have the required permissions for the Voice Agent feature.

## Solution Required ✅

### 1. Check Your API Key Permissions
Your current API key: `98882b420eb71836c82a71a4ec4ba329ae5c2659`

You need to ensure this API key has:
- ✅ **"usage:write"** permissions
- ✅ **Voice Agent** feature access
- ✅ **Member** role (not just Viewer)

### 2. Get a New API Key
If your current key doesn't have Voice Agent access:

1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Navigate to **API Keys**
3. Create a new API key with:
   - **Voice Agent** feature enabled
   - **"usage:write"** scope
   - **Member** role or higher

### 3. Update Your Environment
Replace the API key in `/home/abhi/Projects/Deepgram_AI/deepgram-voice-agent/.env.local`:

```bash
# Replace with your new Voice Agent enabled API key
DEEPGRAM_API_KEY=your_new_voice_agent_api_key_here

# Keep this for development
API_KEY_STRATEGY=provided
```

### 4. Restart the Application
After updating the API key:
```bash
npm run dev
```

## Verification ✨
Once you have the correct API key, the Voice Agent should:
- ✅ Connect to WebSocket without 401 errors
- ✅ Display "Connected" status
- ✅ Allow voice conversations

## Note 📝
Voice Agent is a premium Deepgram feature that may require:
- A paid Deepgram account
- Specific feature enablement
- Higher permission levels

Contact Deepgram support if you need Voice Agent access enabled on your account.