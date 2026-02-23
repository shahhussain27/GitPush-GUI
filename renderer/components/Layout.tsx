import React, { useEffect, useRef } from 'react'
import UpdateStatus from './UpdateStatus'
import TitleBar from './TitleBar'

// --- Sidebar Component ---
interface SidebarProps {
  currentPath: string | null
  onSelectFolder: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onSelectFolder, activeTab, onTabChange }) => {
  return (
    <div className="w-72 bg-gray-900 flex flex-col border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white mb-2">GitPush GUI</h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest">Git Client</p>
      </div>

      <div className="px-4 mb-6">
        <button 
          onClick={onSelectFolder}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>📁</span> Select Repository
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {currentPath ? (
          <div className="space-y-4">
            <div className="bg-gray-800 p-3 rounded-md border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Active Project</p>
              <p className="text-sm font-mono truncate text-blue-400" title={currentPath}>
                {currentPath.split(/[\\/]/).pop()}
              </p>
            </div>
            
            <nav className="space-y-1">
              <SidebarItem 
                label="Status" 
                active={activeTab === 'Status'} 
                icon="📊" 
                onClick={() => onTabChange('Status')}
              />
              <SidebarItem 
                label="Changes" 
                active={activeTab === 'Changes'} 
                icon="📝" 
                onClick={() => onTabChange('Changes')}
              />
              <SidebarItem 
                label="History" 
                active={activeTab === 'History'} 
                icon="🕒" 
                onClick={() => onTabChange('History')}
              />
              <SidebarItem 
                label="Publish" 
                active={activeTab === 'Publish'} 
                icon="🚀" 
                onClick={() => onTabChange('Publish')}
              />
              <SidebarItem 
                label="Settings" 
                active={activeTab === 'Settings'} 
                icon="⚙️" 
                onClick={() => onTabChange('Settings')}
              />
            </nav>
          </div>
        ) : (
          <div className="text-center mt-10">
            <p className="text-sm text-gray-500 italic">No repository selected</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Git Ready
        </div>
      </div>
    </div>
  )
}

const SidebarItem: React.FC<{ label: string; active?: boolean; icon: string; onClick: () => void }> = ({ label, active, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
    active ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50 text-gray-400'
  }`}>
    <span className="text-sm">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
)

// --- Terminal Component ---
interface TerminalProps {
  logs: string[]
  onRunCommand?: (command: string) => void
  onClear?: () => void
}

const Terminal: React.FC<TerminalProps> = ({ logs, onRunCommand, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [command, setCommand] = React.useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && onRunCommand) {
      onRunCommand(command)
      setCommand('')
    }
  }

  return (
    <div className="h-64 bg-black border-t border-gray-800 flex flex-col font-mono text-xs">
      <div className="bg-gray-900 px-4 py-1 border-b border-gray-800 flex justify-between items-center text-gray-400 uppercase tracking-tight text-[10px]">
        <span>Console Output</span>
        <button 
          onClick={onClear}
          className="hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-0">
        {logs.length === 0 ? (
          <p className="text-gray-700 italic">No output yet...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              <span className="text-gray-600 mr-2">$</span>
              {log}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-800 bg-gray-900/50 p-2 flex gap-3">
        <span className="text-blue-500 font-bold ml-2">git</span>
        <input 
          type="text" 
          value={command}
          onChange={(e) => {
            const val = e.target.value;
            // Ensure the user doesn't delete the 'git ' prefix if they type it,
            // or we just prepend 'git ' automatically if they don't.
            // Actually, for simplicity, let's just make it a normal input.
            setCommand(val)
          }}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && !command.startsWith('git ')) {
                // If the user forgot 'git ', we add it for them
                // setCommand('git ' + command) // This is reactive, might be too slow
             }
          }}
          placeholder="type your command here (e.g. status)"
          className="bg-transparent border-none outline-none text-gray-300 flex-1 placeholder:text-gray-700"
        />
        <button 
          type="submit"
          className="text-[10px] text-gray-500 hover:text-blue-400 uppercase tracking-widest font-bold px-3 transition-colors"
        >
          Run
        </button>
      </form>
    </div>
  )
}

// --- Layout Component ---
interface LayoutProps {
  children: React.ReactNode
  currentPath: string
  onSelectFolder: () => void
  terminalOutput: string[]
  onRunCommand: (command: string) => void
  onClearTerminal?: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}

const Layout: React.FC<LayoutProps> = ({ 
  children, currentPath, onSelectFolder, terminalOutput, onRunCommand, onClearTerminal, activeTab, onTabChange 
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 overflow-hidden font-sans">
      <TitleBar onSelectFolder={onSelectFolder} />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar 
        currentPath={currentPath} 
        onSelectFolder={onSelectFolder} 
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <main className="flex-1 flex flex-col overflow-hidden border-l border-gray-800">
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
        <Terminal logs={terminalOutput} onRunCommand={onRunCommand} onClear={onClearTerminal} />
      </main>
    </div>
    <UpdateStatus />
  </div>
)
}

export default Layout
