#!/usr/bin/env node

// Test script to verify Grok API connection
require('dotenv').config();
const OpenAI = require('openai');

const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

async function testGrokConnection() {
  console.log('Testing Grok API connection...');
  console.log('API Key exists:', !!process.env.GROK_API_KEY);
  console.log('API Key length:', process.env.GROK_API_KEY?.length || 0);
  console.log('API Key prefix:', process.env.GROK_API_KEY?.substring(0, 10) + '...' || 'N/A');
  
  try {
    const completion = await grokClient.chat.completions.create({
      model: 'grok-2-mini',
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: 'Please respond with a simple JSON object: {"status": "working", "model": "grok", "timestamp": "' + new Date().toISOString() + '"}'
        }
      ]
    });

    const response = completion.choices[0]?.message?.content;
    console.log('\n✅ Grok API Response:');
    console.log(response);
    console.log('\n✅ Model used:', completion.model);
    console.log('✅ Usage:', completion.usage);
    
    // Test JSON parsing
    try {
      const parsed = JSON.parse(response);
      console.log('✅ JSON parsing successful:', parsed);
    } catch (e) {
      console.log('❌ JSON parsing failed:', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ Grok API Error:');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGrokConnection().catch(console.error);
