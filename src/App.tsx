import React from 'react';
import CodeEditor from './components/Editor';

function App() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-screen">
        <CodeEditor />
      </div>
      <div className="fixed bottom-4 right-4 text-gray-400 text-sm">
        Made on <a href="https://bolt.new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Bolt.new</a>
      </div>
    </div>
  );
}

export default App;