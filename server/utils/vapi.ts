/**
 * Vapi.ai API Integration
 * This file handles all interactions with the Vapi.ai API for voice synthesis and AI voice agents
 */

import fetch from 'node-fetch';

// Ensure the token is available - falls back to ElevenLabs token if Vapi token is not available
const VAPI_AI_TOKEN = process.env.VAPI_AI_TOKEN || '';
// ElevenLabs API token (separate in case we need both)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

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
export async function synthesizeSpeech(options: VoiceSynthesisOptions): Promise<{ success: boolean; audioUrl?: string; message?: string }> {
  // Try ElevenLabs API first, then fall back to Vapi if needed
  if (ELEVENLABS_API_KEY) {
    try {
      // Merge options with defaults for ElevenLabs settings
      const mergedOptions = {
        ...DEFAULT_VOICE_OPTIONS,
        ...options
      };

      // Voice ID is required
      if (!mergedOptions.voiceId) {
        return {
          success: false,
          message: "Voice ID is required for text-to-speech synthesis"
        };
      }

      // Create ElevenLabs request payload
      const elevenLabsPayload = {
        text: mergedOptions.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true,
          speaking_rate: mergedOptions.speed || 1.0
        }
      };

      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${mergedOptions.voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(elevenLabsPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.detail?.message || errorText;
        } catch (e) {
          errorMsg = errorText;
        }
        console.error(`ElevenLabs API error: ${response.status} - ${errorMsg}`);
        
        return {
          success: false,
          message: `ElevenLabs API error: ${errorMsg}`
        };
      }

      // Get audio data as ArrayBuffer
      const audioData = await response.arrayBuffer();
      
      // Convert audio data to base64
      const base64Audio = Buffer.from(audioData).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      
      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      console.error('Error in ElevenLabs speech synthesis:', error);
      return {
        success: false,
        message: `Error in ElevenLabs speech synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  } 
  // Fall back to Vapi if ElevenLabs API key is not available
  else if (VAPI_AI_TOKEN) {
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
        return {
          success: false,
          message: `Vapi.ai API error: ${errorData}`
        };
      }

      const data = await response.json() as any;
      return {
        success: true,
        audioUrl: data.audio_url
      };
    } catch (error) {
      console.error('Error in Vapi.ai speech synthesis:', error);
      return {
        success: false,
        message: `Error in Vapi.ai speech synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // No API keys available
  return {
    success: false,
    message: 'No API keys available for text-to-speech synthesis. Please set ELEVENLABS_API_KEY or VAPI_AI_TOKEN in your environment variables.'
  };
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
export async function getAvailableVoices(): Promise<{ success: boolean; voices: VoiceInfo[]; message?: string }> {
  try {
    // Check if API key is available
    if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'your_elevenlabs_key_here') {
      return { 
        success: false, 
        voices: [],
        message: "ElevenLabs API key is not set. Please add your API key to the .env file."
      };
    }

    // Use ElevenLabs API to get available voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }
      
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      
      // Return a descriptive error message based on the status code
      if (response.status === 401) {
        return { 
          success: false, 
          voices: [],
          message: "Invalid ElevenLabs API key. Please check your API key in the .env file."
        };
      } else if (response.status === 429) {
        return {
          success: false,
          voices: [],
          message: "Too many requests to ElevenLabs API. Please try again later."
        };
      } else {
        return {
          success: false,
          voices: [],
          message: `ElevenLabs API error: ${errorData.detail?.message || errorText}`
        };
      }
    }

    const data = await response.json();
    
    // Map the response to our interface
    if (data && data.voices && Array.isArray(data.voices)) {
      const mappedVoices = data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'unknown',
        description: voice.description || '',
        preview_url: voice.preview_url || '',
        gender: voice.labels?.gender || '',
        age: voice.labels?.age || '',
        accent: voice.labels?.accent || '',
        language: voice.labels?.language || 'English',
        use_case: voice.labels?.use_case || '',
        style: voice.labels?.style || '',
        is_clone: voice.labels?.is_clone === 'true'
      }));
      
      return {
        success: true,
        voices: mappedVoices
      };
    }
    
    return {
      success: false,
      voices: [],
      message: "No voices found in the ElevenLabs response."
    };
  } catch (error) {
    console.error('Error fetching available voices:', error);
    return {
      success: false,
      voices: [],
      message: `Error connecting to ElevenLabs API: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}