import { GoogleGenerativeAI } from '@google/generative-ai';
import MistralClient from '@mistralai/mistralai';
import Groq from 'groq-sdk';

export type AIProvider = 'gemini' | 'mistral' | 'groq';

interface DevelopmentStep {
  description: string;
  prompt: string;
}

interface FileStructure {
  name: string;
  type: 'file' | 'directory';
  children?: FileStructure[];
}

interface ApiKeys {
  geminiKey: string | null;
  mistralKey: string | null;
  groqKey: string | null;
}

class AIService {
  private gemini: GoogleGenerativeAI | null = null;
  private mistral: MistralClient | null = null;
  private groq: Groq | null = null;
  private keysInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private async fetchApiKeys(): Promise<ApiKeys> {
    try {
      // In a deployed Netlify environment, this will be your function's path.
      // Locally, Netlify Dev CLI usually proxies this to the local function.
      const response = await fetch('/.netlify/functions/get-api-keys');
      if (!response.ok) {
        console.error('Failed to fetch API keys:', response.status, await response.text());
        return { geminiKey: null, mistralKey: null, groqKey: null };
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching API keys from Netlify function:', error);
      return { geminiKey: null, mistralKey: null, groqKey: null };
    }
  }

  private async initializeClients(): Promise<void> {
    if (this.keysInitialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const { geminiKey, mistralKey, groqKey } = await this.fetchApiKeys();

      if (geminiKey) {
        try {
          this.gemini = new GoogleGenerativeAI(geminiKey);
        } catch (e) {
          console.error("Failed to initialize Gemini client:", e);
        }
      } else {
        console.warn("Gemini API key not provided or fetched.");
      }

      if (mistralKey) {
        try {
          this.mistral = new MistralClient(mistralKey);
        } catch (e) {
          console.error("Failed to initialize Mistral client:", e);
        }
      } else {
        console.warn("Mistral API key not provided or fetched.");
      }

      if (groqKey) {
        try {
          this.groq = new Groq({
            apiKey: groqKey,
            dangerouslyAllowBrowser: true, // Keep this if SDK is used client-side after fetching key
          });
        } catch (e) {
          console.error("Failed to initialize Groq client:", e);
        }
      } else {
        console.warn("Groq API key not provided or fetched.");
      }
      this.keysInitialized = true;
    })();
    
    return this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.keysInitialized) {
      await this.initializeClients();
    }
  }

  async generateDetailedPlan(prompt: string, provider: AIProvider): Promise<DevelopmentStep[]> {
    await this.ensureInitialized();
    
    const systemPrompt = `You are an expert software developer. Create a detailed, step-by-step development plan for the following request. For each step, provide:
1. A clear description of what needs to be done
2. A specific prompt that can be given to an AI to implement that step

Format your response as a JSON array of objects, each with 'description' and 'prompt' fields.`;

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized. Check API Key.');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          const response = result.response.text();
          return JSON.parse(response);
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized. Check API Key.');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          if (chatResponse.choices && chatResponse.choices[0] && chatResponse.choices[0].message) {
             return JSON.parse(chatResponse.choices[0].message.content);
          }
          throw new Error('Invalid Mistral API response structure for plan generation.');
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized. Check API Key.');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            return JSON.parse(completion.choices[0].message.content || '{}');
          }
          throw new Error('Invalid Groq API response structure for plan generation.');
        }
        default:
          throw new Error('Invalid AI provider');
      }
    } catch (error) {
      console.error(`Error generating plan with ${provider}:`, error);
      throw error;
    }
  }

  async generateFileStructure(prompt: string, provider: AIProvider): Promise<FileStructure[]> {
    await this.ensureInitialized();
        
    const systemPrompt = `You are an expert software developer. Generate a file structure for a local application based on the following requirements. Include all necessary files and directories.

Format your response as a JSON array of objects with the following structure:
{
  "name": "filename or directory name",
  "type": "file" or "directory",
  "children": [] (optional, for directories only)
}`;

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized. Check API Key.');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          const response = result.response.text();
          return JSON.parse(response);
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized. Check API Key.');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
           if (chatResponse.choices && chatResponse.choices[0] && chatResponse.choices[0].message) {
            return JSON.parse(chatResponse.choices[0].message.content);
          }
          throw new Error('Invalid Mistral API response structure for file structure generation.');
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized. Check API Key.');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
             return JSON.parse(completion.choices[0].message.content || '[]');
          }
           throw new Error('Invalid Groq API response structure for file structure generation.');
        }
        default:
          throw new Error('Invalid AI provider');
      }
    } catch (error) {
      console.error(`Error generating file structure with ${provider}:`, error);
      throw error;
    }
  }

  async generateCode(prompt: string, provider: AIProvider): Promise<string> {
    await this.ensureInitialized();
        
    const systemPrompt = "You are an expert programmer. Generate clean, well-documented code based on the following prompt. Only return the code, no explanations.";

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized. Check API Key.');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          return result.response.text();
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized. Check API Key.');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          if (chatResponse.choices && chatResponse.choices[0] && chatResponse.choices[0].message) {
            return chatResponse.choices[0].message.content;
          }
          throw new Error('Invalid Mistral API response structure for code generation.');
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized. Check API Key.');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
           if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            return completion.choices[0].message.content || '';
          }
          throw new Error('Invalid Groq API response structure for code generation.');
        }
        default:
          throw new Error('Invalid AI provider');
      }
    } catch (error) {
      console.error(`Error generating code with ${provider}:`, error);
      throw error;
    }
  }
}

export const aiService = new AIService();