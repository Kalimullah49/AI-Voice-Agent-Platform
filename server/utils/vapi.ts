/**
 * Vapi.ai API Integration
 * This file handles all interactions with the Vapi.ai API for voice synthesis and AI voice agents
 */

import fetch from 'node-fetch';

// Ensure the token is available - falls back to ElevenLabs token if Vapi token is not available
const VAPI_AI_TOKEN = process.env.VAPI_AI_TOKEN || '';
// ElevenLabs API token (separate in case we need both)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// Vapi.ai API Base URL
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

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
  try {
    // Check if ElevenLabs API key is available
    if (!ELEVENLABS_API_KEY) {
      return {
        success: false,
        message: "ElevenLabs API key is not defined. Please set it in your environment variables."
      };
    }
    
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

    console.log(`Synthesizing speech with ElevenLabs API for voice ID: ${mergedOptions.voiceId}`);

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

/**
 * Delete a Vapi assistant by its ID
 * @param assistantId The ID of the assistant to delete
 * @returns Success status and message
 */
export async function deleteVapiAssistant(assistantId: string): Promise<{ success: boolean; message?: string; }> {
  try {
    // Check if Vapi API token is available
    if (!VAPI_AI_TOKEN) {
      return {
        success: false,
        message: "Vapi.ai API token is not defined. Please set VAPI_AI_TOKEN in your environment variables."
      };
    }
    
    // Make API request to Vapi.ai to delete the assistant
    const response = await fetch(`${VAPI_API_BASE_URL}/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error(`Vapi.ai API error during deletion: ${response.status} - `, errorData);
      return {
        success: false,
        message: `Error deleting Vapi assistant: ${errorData.message || errorData.error || 'Unknown error'}`
      };
    }
    
    return {
      success: true,
      message: "Vapi assistant deleted successfully"
    };
  } catch (error) {
    console.error('Error deleting Vapi assistant:', error);
    return {
      success: false,
      message: `Error deleting Vapi assistant: ${(error as Error).message}`
    };
  }
}

/**
 * Test API connection to Vapi.ai
 * @returns Boolean indicating if the connection was successful
 */
export async function testApiConnection(): Promise<boolean> {
  if (!ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not defined. Please set it in your environment variables.');
    return false;
  }

  try {
    // Simple test request to validate the ElevenLabs API key
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing ElevenLabs API connection:', error);
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

// Interface for Vapi Assistant Creation
export interface VapiAssistantParams {
  name: string;
  firstMessage: string;
  endCallMessage?: string;
  forwardingPhoneNumber?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  recordingEnabled?: boolean;
  hipaaEnabled?: boolean;
  voicemailDetectionEnabled?: boolean;
  endCallFunctionEnabled?: boolean;
  transferCallFunctionEnabled?: boolean;
  metadata?: Record<string, any>;

  model: {
    provider: string;
    model: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: {
          type: string;
          properties: Record<string, any>;
          required: string[];
        };
      };
    }>;
    knowledgeBase?: {
      provider: string;
      files?: Array<{
        id: string;
        name: string;
      }>;
      server?: {
        url: string;
      };
    };
  };

  voice: {
    provider: string;
    voiceId?: string; // Make voiceId optional
    speed?: number;
    temperature?: number;
    guidance?: number;
  };

  transcriber?: {
    provider: string;
    model?: string;
    language?: string;
    endUtteranceSilenceThreshold?: number;
  };
}

/**
 * Get a list of assistants from Vapi.ai
 * @returns A list of assistants or an error message
 */
export async function getVapiAssistants(): Promise<{ success: boolean; assistants?: any[]; message?: string; }> {
  try {
    // Check if Vapi API token is available
    if (!VAPI_AI_TOKEN) {
      return {
        success: false,
        message: "Vapi.ai API token is not defined. Please set VAPI_AI_TOKEN in your environment variables."
      };
    }
    
    // Make API request to Vapi.ai to get assistants
    const response = await fetch(`${VAPI_API_BASE_URL}/assistant`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      }
    });
    
    const responseData = await response.json() as any;
    
    if (!response.ok) {
      console.error(`Vapi.ai API error: ${response.status} - `, responseData);
      return {
        success: false,
        message: `Error getting Vapi assistants: ${responseData.message || responseData.error || 'Unknown error'}`
      };
    }
    
    return {
      success: true,
      assistants: responseData
    };
  } catch (error) {
    console.error('Error getting Vapi assistants:', error);
    return {
      success: false,
      message: `Error getting Vapi assistants: ${(error as Error).message}`
    };
  }
}

/**
 * Find a Vapi assistant by metadata.agentId
 * @param agentId The agent ID to look for in metadata
 * @returns The assistant ID if found, null otherwise
 */
export async function findVapiAssistantByAgentId(agentId: string | number): Promise<string | null> {
  try {
    const result = await getVapiAssistants();
    
    if (!result.success || !result.assistants) {
      return null;
    }
    
    const assistant = result.assistants.find(assistant => 
      assistant.metadata && 
      assistant.metadata.agentId && 
      assistant.metadata.agentId.toString() === agentId.toString()
    );
    
    return assistant ? assistant.id : null;
  } catch (error) {
    console.error('Error finding Vapi assistant by agent ID:', error);
    return null;
  }
}

/**
 * Create or update a Vapi assistant using the Vapi.ai API
 * @param params The assistant parameters
 * @returns The created/updated assistant or error message
 */
export async function createVapiAssistant(params: VapiAssistantParams): Promise<{ success: boolean; assistant?: any; message?: string; updated?: boolean }> {
  try {
    // Check if Vapi API token is available
    if (!VAPI_AI_TOKEN) {
      return {
        success: false,
        message: "Vapi.ai API token is not defined. Please set VAPI_AI_TOKEN in your environment variables."
      };
    }
    
    // Check if assistant already exists for this agent
    const existingAssistantId = params.metadata?.agentId 
      ? await findVapiAssistantByAgentId(params.metadata.agentId)
      : null;
    
    let url = `${VAPI_API_BASE_URL}/assistant`;
    let method = 'POST';
    
    if (existingAssistantId) {
      console.log(`Updating existing Vapi assistant: ${existingAssistantId} for agent: ${params.metadata?.agentId}`);
      url = `${VAPI_API_BASE_URL}/assistant/${existingAssistantId}`;
      method = 'PATCH';
    } else {
      console.log(`Creating Vapi assistant: ${params.name}`);
    }
    
    // Make API request to Vapi.ai to create or update assistant
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      },
      body: JSON.stringify(params)
    });
    
    const responseData = await response.json() as any;
    
    if (!response.ok) {
      console.error(`Vapi.ai API error: ${response.status} - `, responseData);
      return {
        success: false,
        message: `Error ${existingAssistantId ? 'updating' : 'creating'} Vapi assistant: ${responseData.message || responseData.error || 'Unknown error'}`
      };
    }
    
    return {
      success: true,
      assistant: responseData,
      updated: !!existingAssistantId
    };
  } catch (error) {
    console.error('Error creating Vapi assistant:', error);
    return {
      success: false,
      message: `Error creating Vapi assistant: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Register a phone number with Vapi.ai
 * @param phoneNumber The phone number to register (in E.164 format)
 * @param twilioAccountSid The Twilio account SID
 * @param twilioAuthToken The Twilio auth token
 * @returns Success status and message
 */
export async function registerPhoneNumberWithVapi(
  phoneNumber: string, 
  twilioAccountSid: string, 
  twilioAuthToken: string
): Promise<{ success: boolean; message?: string; phoneNumberId?: string; }> {
  try {
    // Check if Vapi API token is available
    if (!VAPI_AI_TOKEN) {
      return {
        success: false,
        message: "Vapi.ai API token is not defined. Please set VAPI_AI_TOKEN in your environment variables."
      };
    }
    
    // Make API request to Vapi.ai to register the phone number
    const response = await fetch(`${VAPI_API_BASE_URL}/phone-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      },
      body: JSON.stringify({
        phoneNumber,
        provider: "twilio",
        account: {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken
        }
      })
    });
    
    const responseData = await response.json() as any;
    
    if (!response.ok) {
      console.error(`Vapi.ai API error registering phone number: ${response.status} - `, responseData);
      return {
        success: false,
        message: `Error registering phone number with Vapi: ${responseData.message || responseData.error || 'Unknown error'}`
      };
    }
    
    return {
      success: true,
      phoneNumberId: responseData.id,
      message: "Phone number successfully registered with Vapi.ai"
    };
  } catch (error) {
    console.error('Error registering phone number with Vapi:', error);
    return {
      success: false,
      message: `Error registering phone number with Vapi: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
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
      let errorData: any;
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

    const data = await response.json() as any;
    
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