import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Code2, Play, Settings as SettingsIcon, Download, Upload, Save, MessageSquare, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import AIAssistant from './AIAssistant';
import Settings from './Settings';
import FileTree from './FileTree';
import { aiService, type AIProvider } from '../lib/ai-providers';

interface Step {
  description: string;
  prompt: string;
  completed: boolean;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

export default function CodeEditor() {
  const editorRef = useRef(null);
  const [developmentPlan, setDevelopmentPlan] = useState<Step[]>([]);
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [codePrompt, setCodePrompt] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([
    {
      name: 'src',
      type: 'directory',
      children: [
        {
          name: 'index.js',
          type: 'file',
          content: '// Start coding here...'
        }
      ]
    }
  ]);
  const [currentFile, setCurrentFile] = useState('src/index.js');

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLanguage(e.target.value);
  }

  function handleThemeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTheme(e.target.value);
  }

  function getFileContent(path: string): string {
    const parts = path.split('/');
    let current: FileNode[] = files;
    let content = '';

    for (const part of parts) {
      const node = current.find(n => n.name === part);
      if (!node) break;
      
      if (node.type === 'file') {
        content = node.content || '';
      } else {
        current = node.children || [];
      }
    }

    return content;
  }

  function updateFileContent(path: string, content: string) {
    const parts = path.split('/');
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.name === parts[0]) {
          if (parts.length === 1) {
            return { ...node, content };
          }
          return {
            ...node,
            children: node.children ? updateNode(node.children) : []
          };
        }
        return node;
      });
    };

    setFiles(updateNode(files));
  }

  function handleFileSelect(path: string) {
    setCurrentFile(path);
    const content = getFileContent(path);
    if (editorRef.current) {
      editorRef.current.setValue(content);
    }
  }

  function createFile(path: string, type: 'file' | 'directory') {
    const parts = path.split('/');
    const fileName = parts.pop() || '';
    const dirPath = parts.join('/');

    const createNode = (nodes: FileNode[], depth: number = 0): FileNode[] => {
      if (depth === parts.length) {
        return [
          ...nodes,
          {
            name: fileName,
            type,
            ...(type === 'file' ? { content: '' } : { children: [] })
          }
        ];
      }

      return nodes.map(node => {
        if (node.name === parts[depth] && node.type === 'directory') {
          return {
            ...node,
            children: createNode(node.children || [], depth + 1)
          };
        }
        return node;
      });
    };

    setFiles(createNode(files));
    if (type === 'file') {
      setCurrentFile(path);
    }
  }

  function deleteFile(path: string) {
    const parts = path.split('/');
    
    const deleteNode = (nodes: FileNode[]): FileNode[] => {
      if (parts.length === 1) {
        return nodes.filter(node => node.name !== parts[0]);
      }
      
      return nodes.map(node => {
        if (node.name === parts[0] && node.type === 'directory') {
          return {
            ...node,
            children: node.children ? deleteNode(node.children) : []
          };
        }
        return node;
      });
    };

    setFiles(deleteNode(files));
    if (currentFile === path) {
      setCurrentFile('src/index.js');
    }
  }

  function handleSave() {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      updateFileContent(currentFile, content);
    }
  }

  async function handleRun() {
    if (!editorRef.current) return;
    
    setIsRunning(true);
    setOutput('');
    
    const code = editorRef.current.getValue();
    
    try {
      const sandbox = new Function(
        'console',
        `
        const log = [];
        const customConsole = {
          log: (...args) => log.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ')),
          error: (...args) => log.push('Error: ' + args.join(' ')),
          warn: (...args) => log.push('Warning: ' + args.join(' '))
        };
        
        try {
          ${code}
        } catch (error) {
          customConsole.error(error.message);
        }
        
        return log.join('\\n');
        `
      );
      
      const result = sandbox({ log: console.log });
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }

  function handlePlanGenerated(plan: Step[]) {
    setDevelopmentPlan(plan);
  }

  async function handleGenerateCode() {
    if (!codePrompt.trim()) return;
    
    setIsGeneratingCode(true);
    try {
      const code = await aiService.generateCode(codePrompt, selectedProvider);
      if (editorRef.current) {
        editorRef.current.setValue(code);
        handleSave();
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setIsGeneratingCode(false);
    }
  }

  function toggleStepCompletion(index: number) {
    setDevelopmentPlan(plan => 
      plan.map((step, i) => 
        i === index ? { ...step, completed: !step.completed } : step
      )
    );
  }

  function exportProject() {
    const projectData = {
      files,
      settings: {
        language,
        theme
      }
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-ide-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const projectData = JSON.parse(content);
      
      setFiles(projectData.files);
      setLanguage(projectData.settings.language);
      setTheme(projectData.settings.theme);
      
      setCurrentFile('src/index.js');
      
      event.target.value = '';
    } catch (error) {
      console.error('Error importing project:', error);
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="h-6 w-6 text-blue-400" />
            <h1 className="text-xl font-bold">JUST BUILT</h1>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              id="import-project"
              className="hidden"
              accept=".json"
              onChange={importProject}
            />
            <button
              onClick={() => document.getElementById('import-project')?.click()}
              className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            <button
              onClick={exportProject}
              className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-800 text-white rounded px-3 py-1.5 border border-gray-700"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
            </select>
            <select
              value={theme}
              onChange={handleThemeChange}
              className="bg-gray-800 text-white rounded px-3 py-1.5 border border-gray-700"
            >
              <option value="vs-dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
            <button 
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button 
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center space-x-2 rounded bg-blue-500 px-4 py-2 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="rounded p-2 hover:bg-gray-700"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15}>
          <div className="h-full p-4">
            <FileTree
              files={files}
              currentFile={currentFile}
              onFileSelect={handleFileSelect}
              onFileCreate={createFile}
              onFileDelete={deleteFile}
            />
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-500 transition-colors" />
        <Panel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <h2 className="text-lg font-semibold">Code Generation</h2>
                </div>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                  className="bg-gray-900 text-white rounded-md px-3 py-1 border border-gray-700"
                >
                  <option value="gemini">Gemini</option>
                  <option value="mistral">Mistral</option>
                  <option value="groq">Groq</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={codePrompt}
                  onChange={(e) => setCodePrompt(e.target.value)}
                  placeholder="Enter prompt for code generation..."
                  className="flex-1 px-3 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode || !codePrompt.trim()}
                  className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed"
                >
                  {isGeneratingCode ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <Editor
                height="60%"
                defaultLanguage={language}
                language={language}
                value={getFileContent(currentFile)}
                theme={theme}
                onMount={handleEditorDidMount}
                onChange={(value) => {
                  if (value) updateFileContent(currentFile, value);
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  tabSize: 2,
                  autoIndent: 'full',
                  colorDecorators: true,
                }}
              />
              <div className="h-[40%] bg-gray-900 p-4 overflow-auto font-mono">
                <h3 className="text-sm font-semibold mb-2 text-gray-400">Output:</h3>
                <pre className="whitespace-pre-wrap">{output}</pre>
              </div>
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-500 transition-colors" />
        <Panel defaultSize={40} minSize={30}>
          <div className="h-full bg-gray-800 p-4 flex flex-col space-y-4">
            <AIAssistant onPlanGenerated={handlePlanGenerated} />
            
            {developmentPlan.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 flex-1 overflow-auto">
                <h3 className="text-lg font-semibold mb-3">Development Plan</h3>
                <div className="space-y-4">
                  {developmentPlan.map((step, index) => (
                    <div key={index} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{step.description}</h4>
                          <p className="text-sm text-gray-400">Prompt: {step.prompt}</p>
                        </div>
                        <button
                          onClick={() => toggleStepCompletion(index)}
                          className={`ml-4 ${step.completed ? 'text-green-400' : 'text-gray-400'}`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}