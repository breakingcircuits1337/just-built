import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const { prompt, model, type } = JSON.parse(event.body || '{}');

    if (!prompt || !model || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Log the request to Supabase
    await supabase
      .from('llm_requests')
      .insert([
        {
          prompt,
          model,
          type,
          timestamp: new Date().toISOString(),
        },
      ]);

    // Here you would integrate with your chosen LLM provider
    // For now, returning a structured response
    const response = {
      success: true,
      result: type === 'plan' ? [
        {
          description: 'Initialize project structure',
          prompt: 'Create basic project files and directories',
        },
        {
          description: 'Set up development environment',
          prompt: 'Configure development tools and dependencies',
        },
      ] : 'console.log("Hello, World!");',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};