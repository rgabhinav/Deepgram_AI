import { createClient } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'API route is working',
    hasApiKey: !!process.env.DEEPGRAM_API_KEY 
  });
}

export async function POST() {
  console.log('Authentication API called');
  
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    console.log('API key exists:', !!apiKey);
    
    if (!apiKey) {
      console.error('No Deepgram API key found in environment variables');
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    // For development, check if we should use the API key directly (like official demo)
    if (process.env.API_KEY_STRATEGY === "provided") {
      console.log('Using direct API key strategy');
      return NextResponse.json({
        access_token: apiKey
      });
    }

    // Use Deepgram SDK to create temporary token (more secure for production)
    const deepgram = createClient(apiKey);
    const { result: token, error: tokenError } = await deepgram.auth.grantToken();

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      return NextResponse.json(tokenError, { status: 500 });
    }

    console.log('Returning authentication token');
    return NextResponse.json({ ...token });

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Failed to create authentication token' },
      { status: 500 }
    );
  }
}