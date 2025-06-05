import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import MistralClient from '@mistralai/mistralai';
import Groq from 'groq-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const validateApiKeys = () => {
  const missingKeys = [];
  if (!process.env.VITE_GEMINI_API_KEY) missingKeys.push('VITE_GEMINI_API_KEY');
  if (!process.env.VITE_MISTRAL_API_KEY) missingKeys.push('VITE_MISTRAL_API_KEY');
  if (!process.env.VITE_GROQ_API_KEY) missingKeys.push('VITE_GROQ_API_KEY');
  return missingKeys;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { prompt, model, type } = JSON.parse(event.body || '{}');

    if (!prompt || !model || !type) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters: prompt, model, or type' }),
      };
    }

    const missingKeys = validateApiKeys();
    if (missingKeys.length > 0) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Missing API keys: ${missingKeys.join(', ')}. Please check your environment variables.` 
        }),
      };
    }

    let result;
    const systemPrompt = type === 'plan' 
      ? `You are an expert software developer. Create a detailed, step-by-step development plan. Format as JSON array with 'description' and 'prompt' fields.`
      : type === 'structure'
      ? `Generate a file structure as JSON array with 'name', 'type', and optional 'children' fields.`
      : `Generate clean, well-documented code only, no explanations.`;

    switch (model) {
      case 'gemini': {
        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '');
        const genModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const response = await genModel.generateContent(systemPrompt + "\n\n" + prompt);
        result = response.response.text();
        break;
      }
      case 'mistral': {
        const mistral = new MistralClient(process.env.VITE_MISTRAL_API_KEY || '');
        const response = await mistral.chat({
          model: 'mistral-large-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        });
        result = response.choices[0].message.content;
        break;
      }
      case 'groq': {
        const groq = new Groq({
          apiKey: process.env.VITE_GROQ_API_KEY || '',
        });
        const response = await groq.chat.completions.create({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        });
        result = response.choices[0].message.content;
        break;
      }
      default:
        throw new Error(`Invalid model specified: ${model}`);
    }

    if (!result) {
      throw new Error('No response received from AI model');
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error('Error in LLM function:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: `AI model error: ${error.message}. Please check your API keys and try again.` 
      }),
    };
  }
};