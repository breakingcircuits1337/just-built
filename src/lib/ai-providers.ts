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

class AIService {
  private gemini: GoogleGenerativeAI | null = null;
  private mistral: MistralClient | null = null;
  private groq: Groq | null = null;
  private keysInitialized: boolean = false;

  private async initializeClients() {
    if (this.keysInitialized) return;

    try {
      const response = await fetch('/.netlify/functions/get-api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const { geminiKey, mistralKey, groqKey } = await response.json();

      if (geminiKey) {
        this.gemini = new GoogleGenerativeAI(geminiKey);
      }
      if (mistralKey) {
        this.mistral = new MistralClient(mistralKey);
      }
      if (groqKey) {
        this.groq = new Groq({
          apiKey: groqKey,
          dangerouslyAllowBrowser: true
        });
      }

      this.keysInitialized = true;
    } catch (error) {
      console.error('Error initializing AI clients:', error);
      throw new Error('Failed to initialize AI services');
    }
  }

  async generateDetailedPlan(prompt: string, provider: AIProvider): Promise<DevelopmentStep[]> {
    await this.initializeClients();
    
    const systemPrompt = `You are an expert software developer. Create a detailed, step-by-step development plan for the following request. For each step, provide:
1. A clear description of what needs to be done
2. A specific prompt that can be given to an AI to implement that step

Format your response as a JSON array of objects, each with 'description' and 'prompt' fields.`;

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          const response = result.response.text();
          return JSON.parse(response);
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          return JSON.parse(chatResponse.choices[0].message.content);
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
          return JSON.parse(completion.choices[0].message.content || '[]');
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
    await this.initializeClients();
    
    const systemPrompt = `Generate a file structure for a local application based on the following requirements. Include all necessary files and directories.

Format your response as a JSON array of objects with the following structure:
{
  "name": "filename or directory name",
  "type": "file" or "directory",
  "children": [] (optional, for directories only)
}`;

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          const response = result.response.text();
          return JSON.parse(response);
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          return JSON.parse(chatResponse.choices[0].message.content);
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
          return JSON.parse(completion.choices[0].message.content || '[]');
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
    await this.initializeClients();
    
    const systemPrompt = "You are an expert programmer. Generate clean, well-documented code based on the following prompt. Only return the code, no explanations.";

    try {
      switch (provider) {
        case 'gemini': {
          if (!this.gemini) throw new Error('Gemini client not initialized');
          const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(systemPrompt + "\n\nUser request: " + prompt);
          return result.response.text();
        }
        case 'mistral': {
          if (!this.mistral) throw new Error('Mistral client not initialized');
          const chatResponse = await this.mistral.chat({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          });
          return chatResponse.choices[0].message.content;
        }
        case 'groq': {
          if (!this.groq) throw new Error('Groq client not initialized');
          const completion = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768",
          });
          return completion.choices[0].message.content || '';
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