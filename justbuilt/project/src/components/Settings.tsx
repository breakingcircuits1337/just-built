import React from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  if (!isOpen) return null;

  const handleDocsNavigation = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-300">
            API keys are now managed via Netlify environment variables for improved security.
          </p>
          <p className="text-gray-300">
            Please ensure the following environment variables are set in your Netlify project settings:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li><code className="bg-gray-700 px-1 rounded">VITE_GEMINI_API_KEY</code> (for Gemini)</li>
            <li><code className="bg-gray-700 px-1 rounded">VITE_MISTRAL_API_KEY</code> (for Mistral)</li>
            <li><code className="bg-gray-700 px-1 rounded">VITE_GROQ_API_KEY</code> (for Groq)</li>
          </ul>
           <p className="text-sm text-gray-500">
            After setting these variables in Netlify, you may need to redeploy your site for the changes to take effect.
          </p>
        </div>

        <div className="mt-6 flex justify-between items-center">
           <button
            onClick={() => handleDocsNavigation('https://docs.netlify.com/environment-variables/overview/')}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Netlify Env Vars Docs
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}