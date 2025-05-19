/**
 * Vapi.ai API Integration
 * This file handles all interactions with the Vapi.ai API for voice synthesis and AI voice agents
 */

import fetch from 'node-fetch';

// Ensure the token is available
const VAPI_AI_TOKEN = process.env.VAPI_AI_TOKEN;

/**
 * Voice synthesis options interface
 */
interface VoiceSynthesisOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  temperature?: number;
  textGuidance?: number;
  voiceGuidance?: number;
  backgroundNoise?: {
    officeAmbience?: boolean;
    keyboard?: boolean;
    phoneRinging?: boolean;
  };
}

/**
 * Default voice options
 */
const DEFAULT_VOICE_OPTIONS = {
  voiceId: 'man-1', // Default voice ID
  speed: 1.0,
  temperature: 0.4,
  textGuidance: 0.8,
  voiceGuidance: 1.0,
  backgroundNoise: {
    officeAmbience: false,
    keyboard: false,
    phoneRinging: false
  }
};

/**
 * Synthesize text to speech using Vapi.ai API
 * @param options Voice synthesis options
 * @returns URL to the audio file
 */
export async function synthesizeSpeech(options: VoiceSynthesisOptions): Promise<string | null> {
  if (!VAPI_AI_TOKEN) {
    console.error('VAPI_AI_TOKEN is not defined. Please set it in your environment variables.');
    return null;
  }

  try {
    // Merge options with defaults
    const mergedOptions = {
      ...DEFAULT_VOICE_OPTIONS,
      ...options,
      backgroundNoise: {
        ...DEFAULT_VOICE_OPTIONS.backgroundNoise,
        ...(options.backgroundNoise || {})
      }
    };

    // Prepare request payload
    const payload = {
      text: mergedOptions.text,
      voice_id: mergedOptions.voiceId,
      speed: mergedOptions.speed,
      temperature: mergedOptions.temperature,
      text_guidance: mergedOptions.textGuidance,
      voice_guidance: mergedOptions.voiceGuidance,
      background_noise: Object.entries(mergedOptions.backgroundNoise)
        .filter(([_, value]) => value)
        .map(([key]) => key)
    };

    // Make API request to Vapi.ai
    const response = await fetch('https://api.vapi.ai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Vapi.ai API error: ${response.status} - ${errorData}`);
      return null;
    }

    const data = await response.json();
    return data.audio_url;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return null;
  }
}

/**
 * Test API connection to Vapi.ai
 * @returns Boolean indicating if the connection was successful
 */
export async function testApiConnection(): Promise<boolean> {
  if (!VAPI_AI_TOKEN) {
    console.error('VAPI_AI_TOKEN is not defined. Please set it in your environment variables.');
    return false;
  }

  try {
    // Simple test request to validate the API token
    const response = await fetch('https://api.vapi.ai/voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing Vapi.ai API connection:', error);
    return false;
  }
}

/**
 * Voice information interface
 */
export interface VoiceInfo {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  use_case?: string;
  style?: string;
  is_clone?: boolean;
}

/**
 * Get available voices from ElevenLabs
 * @returns Array of voice information objects
 */
export async function getAvailableVoices(): Promise<VoiceInfo[]> {
  if (!VAPI_AI_TOKEN) {
    console.error('VAPI_AI_TOKEN is not defined. Please set it in your environment variables.');
    return [];
  }

  try {
    // Use ElevenLabs API to get available voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': VAPI_AI_TOKEN // ElevenLabs uses the same token format
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorData}`);
      return [];
    }

    const data = await response.json() as any;
    
    // Map the response to our interface
    if (data && data.voices && Array.isArray(data.voices)) {
      return data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'unknown',
        description: voice.description,
        preview_url: voice.preview_url,
        gender: voice.labels?.gender,
        age: voice.labels?.age,
        accent: voice.labels?.accent,
        language: voice.labels?.language,
        use_case: voice.labels?.use_case,
        style: voice.labels?.style,
        is_clone: voice.labels?.is_clone === 'true'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching available voices:', error);
    return [];
  }
}