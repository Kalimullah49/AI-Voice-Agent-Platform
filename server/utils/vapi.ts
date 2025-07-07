/**
 * Vapi.ai API Integration
 * This file handles all interactions with the Vapi.ai API for voice synthesis and AI voice agents
 */

import fetch from 'node-fetch';

// Hardcoded API keys for production reliability
const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';
const VAPI_PUBLIC_KEY = '49c87404-6985-4e57-9fe3-4bbe4cd5d7f5';

// ElevenLabs API token for voice synthesis
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_4337a989be76c7288b9d1815c3cd6d851d6cdee452da1898';

// Debug hardcoded keys on startup
console.log('🔍 Hardcoded API Keys Check:');
console.log('VAPI_PRIVATE_KEY exists:', !!VAPI_PRIVATE_KEY);
console.log('VAPI_PUBLIC_KEY exists:', !!VAPI_PUBLIC_KEY);
console.log('ELEVENLABS_API_KEY exists:', !!ELEVENLABS_API_KEY);

// Flag to enable detailed debugging
const DEBUG_MODE = true;

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
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella voice - valid ElevenLabs voice ID (similar to Savannah)
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
    
    // Make API request to Vapi.ai to delete the assistant
    const response = await fetch(`${VAPI_API_BASE_URL}/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
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
  server?: {
    url: string;
  };

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
    
    // Make API request to Vapi.ai to get assistants
    const response = await fetch(`${VAPI_API_BASE_URL}/assistant`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
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
    
    // Log request information for debugging
    console.log(`Making request to Vapi.ai: ${method} ${url}`);
    console.log('Request payload:', JSON.stringify(params, null, 2));
    
    // Make API request to Vapi.ai to create or update assistant
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
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
 * Delete a phone number from Vapi.ai
 * @param phoneNumberId The Vapi.ai phone number ID
 * @returns Success status and message
 */
export async function deleteVapiPhoneNumber(phoneNumberId: string): Promise<{ success: boolean; message?: string; }> {
  try {
    // Check if Vapi private key is available
    if (!VAPI_PRIVATE_KEY) {
      return {
        success: false,
        message: "Vapi.ai private key is not defined. Please set VAPI_PRIVATE_KEY in your environment variables."
      };
    }
    
    // Make API request to Vapi.ai to delete the phone number
    const response = await fetch(`${VAPI_API_BASE_URL}/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error(`Vapi.ai API error during phone number deletion: ${response.status} - `, errorData);
      return {
        success: false,
        message: `Error deleting Vapi phone number: ${errorData.message || errorData.error || 'Unknown error'}`
      };
    }
    
    return {
      success: true,
      message: "Vapi phone number deleted successfully"
    };
  } catch (error) {
    console.error('Error deleting Vapi phone number:', error);
    return {
      success: false,
      message: `Error deleting Vapi phone number: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    // Check if Vapi private key is available
    if (!VAPI_PRIVATE_KEY) {
      console.error("VAPI_PRIVATE_KEY is missing. Please set this environment variable.");
      return {
        success: false,
        message: "Vapi.ai private key is not defined. Please set VAPI_PRIVATE_KEY in your environment variables."
      };
    }
    
    // Format phone number to ensure E.164 format (if not already)
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
    
    console.log(`Attempting to register phone number with Vapi.ai: ${formattedPhoneNumber}`);
    
    // Direct API call to Vapi.ai with the correct payload format 
    // Based on the error message, they're expecting different field names
    const response = await fetch(`${VAPI_API_BASE_URL}/phone-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      },
      body: JSON.stringify({
        number: formattedPhoneNumber,
        provider: "twilio",
        twilioAccountSid: twilioAccountSid,
        twilioAuthToken: twilioAuthToken
      })
    });
    
    // Parse response data
    let responseData: any;
    try {
      responseData = await response.json();
      console.log(`Vapi.ai registration response status: ${response.status}, data:`, JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error("Error parsing Vapi.ai response:", parseError);
      return {
        success: false,
        message: `Error parsing Vapi.ai response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
    
    if (!response.ok) {
      console.error(`Vapi.ai API error registering phone number: ${response.status} - `, responseData);
      return {
        success: false,
        message: `Error registering number with Vapi.ai: ${responseData?.message || responseData?.error || response.statusText}`
      };
    }
    
    if (!responseData || !responseData.id) {
      console.warn('Vapi.ai registration succeeded but no phone number ID was returned:', responseData);
      
      // Try to find the ID in the response in case the response format has changed
      const id = responseData?.id || responseData?.phoneNumberId || responseData?.phone_number_id;
      
      if (id) {
        console.log(`Found phone number ID "${id}" in an alternative field of the response`);
        return {
          success: true,
          phoneNumberId: id,
          message: "Phone number successfully registered with Vapi.ai"
        };
      }
      
      return {
        success: true,
        message: "Phone number may have been registered with Vapi.ai but no ID was returned"
      };
    }
    
    console.log(`Successfully registered phone number ${formattedPhoneNumber} with Vapi.ai, ID: ${responseData.id}`);
    
    return {
      success: true,
      phoneNumberId: responseData.id,
      message: "Phone number successfully registered with Vapi.ai"
    };
  } catch (error) {
    console.error('Error registering phone number with Vapi:', error);
    return {
      success: false,
      message: `Error registering phone number with Vapi: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get available voices from ElevenLabs
 * @returns Array of voice information objects
 */
export async function getAvailableVoices(): Promise<{ success: boolean; voices: VoiceInfo[]; message?: string }> {
  try {
    // First try to get voices from ElevenLabs API
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
      
      // Return default voices if API fails
      const defaultVoices: VoiceInfo[] = [
        {
          voice_id: 'EXAVITQu4vr4xnSDxMaL',
          name: 'Bella',
          category: 'narration',
          description: 'Young, friendly female voice',
          preview_url: '',
          gender: 'Female',
          age: 'Young Adult',
          accent: 'American',
          language: 'English',
          use_case: 'narration',
          style: 'friendly',
          is_clone: false
        },
        {
          voice_id: 'pNInz6obpgDQGcFmaJgB',
          name: 'Adam',
          category: 'narration',
          description: 'Deep, mature male voice',
          preview_url: '',
          gender: 'Male',
          age: 'Middle Aged',
          accent: 'American',
          language: 'English',
          use_case: 'narration',
          style: 'conversational',
          is_clone: false
        },
        {
          voice_id: 'XB0fDUnXU5powFXDhCwa',
          name: 'Charlotte',
          category: 'conversational',
          description: 'Warm, professional female voice',
          preview_url: '',
          gender: 'Female',
          age: 'Middle Aged',
          accent: 'British',
          language: 'English',
          use_case: 'conversational',
          style: 'professional',
          is_clone: false
        },
        {
          voice_id: 'bVMeCyTHy58xNoL34h3p',
          name: 'Jeremy',
          category: 'conversational', 
          description: 'Young, energetic male voice',
          preview_url: '',
          gender: 'Male',
          age: 'Young Adult',
          accent: 'American',
          language: 'English',
          use_case: 'conversational',
          style: 'energetic',
          is_clone: false
        }
      ];
      
      return {
        success: true,
        voices: defaultVoices,
        message: `Using default voices. ElevenLabs API error: ${response.status === 401 ? 'Invalid API key' : 'Connection failed'}`
      };
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