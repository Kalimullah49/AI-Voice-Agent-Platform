// Script to clear existing call data for a fresh start
const fetch = require('node-fetch');

async function clearCalls() {
  try {
    const response = await fetch('http://localhost:5000/api/calls/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (data.success) {
      console.log(`Successfully cleared ${data.count} call records`);
    } else {
      console.error('Failed to clear calls:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

clearCalls();