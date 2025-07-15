// Test script to simulate a Vapi webhook with recording data
import fetch from 'node-fetch';

async function testRecordingWebhook() {
  const webhookData = {
    message: {
      type: 'end-of-call-report',
      call: {
        id: 'test-call-id-123',
        status: 'completed',
        assistantId: '3ed3fa6e-08a0-4a39-8042-a11464e445f4',
        type: 'outboundPhoneCall'
      },
      assistant: {
        id: '3ed3fa6e-08a0-4a39-8042-a11464e445f4'
      },
      phoneNumber: {
        number: '+14155551234'
      },
      customer: {
        number: '+14155555678'
      },
      durationSeconds: 120,
      cost: 0.25,
      endedReason: 'assistant-ended-call',
      artifact: {
        recordingUrl: 'https://example.com/recording.mp3'
      }
    }
  };

  try {
    const response = await fetch('http://localhost:5000/api/webhook/vapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.json();
    console.log('Webhook response:', result);
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

testRecordingWebhook();