import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Make the Deepgram API key available to the client side
    // Note: This is fine for demo purposes, but for production you should use server-side auth
    NEXT_PUBLIC_DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  },
};

export default nextConfig;
