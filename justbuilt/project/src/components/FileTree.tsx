import React from 'react';
import { File, Folder, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

interface FileTreeProps {
  files: FileNode[];
  currentFile: string;
  onFileSelect: (path: string) => void;
  onFileCreate: (path: string, type: 'file' | 'directory') => void;
  onFileDelete: (path: string) => void;
}

export default function FileTree({
  files,
  currentFile,
  onFileSelect,
  onFileCreate,
  onFileDelete
}: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(new Set());

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderNode = (node: FileNode, path: string = '') => {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedDirs.has(fullPath);
    const isDirectory = node.type === 'directory';

    return (
      <div key={fullPath} className="select-none">
        <div
          className={`flex items-center space-x-1 px-2 py-1 hover:bg-gray-700 rounded ${
            currentFile === fullPath ? 'bg-gray-700' : ''
          }`}
        >
          {isDirectory ? (
            <button
              onClick={() => toggleDir(fullPath)}
              className="flex items-center group"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
              )}
              <Folder className="h-4 w-4 text-blue-400 ml-1" />
              <span className="ml-1">{node.name}</span>
            </button>
          ) : (
            <div
              className="flex items-center cursor-pointer"
              onClick={() => onFileSelect(fullPath)}
            >
              <File className="h-4 w-4 text-gray-400" />
              <span className="ml-1">{node.name}</span>
            </div>
          )}
          
          <div className="ml-auto flex items-center space-x-1 opacity-0 group-hover:opacity-100">
            {isDirectory && (
              <button
                onClick={() => {
                  const fileName = window.prompt('Enter file name:');
                  if (fileName) onFileCreate(`${fullPath}/${fileName}`, 'file');
                }}
                className="p-1 hover:bg-gray-600 rounded"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onFileDelete(fullPath)}
              className="p-1 hover:bg-gray-600 rounded"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        </div>
        
        {isDirectory && isExpanded && node.children && (
          <div className="ml-4">
            {node.children.map((child) => renderNode(child, fullPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 p-2 rounded-lg">
      {files.map((node) => renderNode(node))}
    </div>
  );
}