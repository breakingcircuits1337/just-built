import React, { useState } from 'react';
import { MessageSquare, Loader2, FolderTree } from 'lucide-react';
import { aiService, type AIProvider } from '../lib/ai-providers';

interface Step {
  description: string;
  prompt: string;
  completed: boolean;
}

interface FileStructure {
  name: string;
  type: 'file' | 'directory';
  children?: FileStructure[];
}

interface AIAssistantProps {
  onPlanGenerated: (plan: Step[]) => void;
}

export default function AIAssistant({ onPlanGenerated }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [error, setError] = useState<string | null>(null);
  const [projectType, setProjectType] = useState('web');
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const projectContext = `Create a ${projectType === 'web' ? 'serverless web application' : 'local application'} with the following requirements: ${prompt}`;

    try {
      const [steps, structure] = await Promise.all([
        aiService.generateDetailedPlan(projectContext, provider),
        projectType === 'local' ? aiService.generateFileStructure(prompt, provider) : Promise.resolve([])
      ]);
      
      onPlanGenerated(steps.map(step => ({
        description: step.description,
        prompt: step.prompt,
        completed: false
      })));
      
      if (projectType === 'local') {
        setFileStructure(structure);
      } else {
        setFileStructure([]);
      }
      
      setPrompt('');
    } catch (err) {
      setError('Failed to generate plan. Please check your API keys and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFileStructure = (items: FileStructure[], level = 0) => {
    return (
      <div className="ml-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 my-1">
            <span className="text-gray-400">{'\u2514'.repeat(level + 1)}</span>
            <FolderTree className={`h-4 w-4 ${item.type === 'directory' ? 'text-blue-400' : 'text-gray-400'}`} />
            <span>{item.name}</span>
            {item.children && (
              <div className="ml-4">
                {renderFileStructure(item.children, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="bg-gray-900 text-white rounded-md px-3 py-1 border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="web">Serverless Web App</option>
            <option value="local">Local App</option>
          </select>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className="bg-gray-900 text-white rounded-md px-3 py-1 border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="gemini">Gemini</option>
            <option value="mistral">Mistral</option>
            <option value="groq">Groq</option>
          </select>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build..."
          className="w-full h-32 px-3 py-2 text-white bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Generating Plan...</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-5 w-5" />
              <span>Generate Development Plan</span>
            </>
          )}
        </button>
      </form>

      {fileStructure.length > 0 && (
        <div className="mt-6 bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Project File Structure</h3>
          {renderFileStructure(fileStructure)}
        </div>
      )}
    </div>
  );
}