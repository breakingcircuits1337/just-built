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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error(`Error calling LLM function:`, error);
      throw error;
    }
  }

  async generateDetailedPlan(prompt: string, provider: AIProvider): Promise<DevelopmentStep[]> {
    try {
      const result = await this.callLLMFunction(prompt, provider, 'plan');
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (error) {
      console.error(`Error generating plan with ${provider}:`, error);
      throw error;
    }
  }

  async generateFileStructure(prompt: string, provider: AIProvider): Promise<FileStructure[]> {
    try {
      const result = await this.callLLMFunction(prompt, provider, 'structure');
      return typeof result === 'string' ? JSON.parse(result) : result;
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