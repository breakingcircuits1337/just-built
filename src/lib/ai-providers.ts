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
  private async callLLMFunction(prompt: string, model: AIProvider, type: 'plan' | 'structure' | 'code') {
    try {
      const response = await fetch('/.netlify/functions/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, model, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.result) {
        throw new Error('No result received from the AI model');
      }

      return data.result;
    } catch (error) {
      console.error(`Error calling LLM function:`, error);
      throw new Error(`Failed to generate ${type}: ${error.message}`);
    }
  }

  async generateDetailedPlan(prompt: string, provider: AIProvider): Promise<DevelopmentStep[]> {
    try {
      const result = await this.callLLMFunction(prompt, provider, 'plan');
      if (typeof result === 'string') {
        try {
          return JSON.parse(result);
        } catch (error) {
          throw new Error('Invalid JSON response from AI model');
        }
      }
      return result;
    } catch (error) {
      console.error(`Error generating plan with ${provider}:`, error);
      throw error;
    }
  }

  async generateFileStructure(prompt: string, provider: AIProvider): Promise<FileStructure[]> {
    try {
      const result = await this.callLLMFunction(prompt, provider, 'structure');
      if (typeof result === 'string') {
        try {
          return JSON.parse(result);
        } catch (error) {
          throw new Error('Invalid JSON response from AI model');
        }
      }
      return result;
    } catch (error) {
      console.error(`Error generating file structure with ${provider}:`, error);
      throw error;
    }
  }

  async generateCode(prompt: string, provider: AIProvider): Promise<string> {
    try {
      const result = await this.callLLMFunction(prompt, provider, 'code');
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      console.error(`Error generating code with ${provider}:`, error);
      throw error;
    }
  }
}

export const aiService = new AIService();