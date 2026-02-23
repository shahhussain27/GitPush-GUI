import React, { useEffect, useRef } from 'react'
import UpdateStatus from './UpdateStatus'
import TitleBar from './TitleBar'
import { 
  LayoutDashboard, 
  FileEdit, 
  History, 
  Rocket, 
  Settings, 
  ChevronRight,
  Terminal as TerminalIcon,
  Eraser,
  FolderPlus
} from 'lucide-react'
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

// --- Sidebar Component ---
interface SidebarProps {
  currentPath: string | null
  onSelectFolder: () => void
  activeTab: string
  onTabChange: (tab: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onSelectFolder, activeTab, onTabChange }) => {
  return (
    <div className="w-64 bg-gray-950 flex flex-col border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white mb-1">GitPush GUI</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Git Client
        </p>
      </div>

      <div className="px-4 mb-4">
        <Button 
          onClick={onSelectFolder}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2"
        >
          <FolderPlus className="size-4" />
          Select Repository
        </Button>
      </div>

      <Separator className="mx-4 w-auto bg-gray-800 mb-4" />

      <ScrollArea className="flex-1 px-3">
        {currentPath ? (
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50 mb-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Active Project</p>
              <p className="text-xs font-mono truncate text-blue-400 font-medium" title={currentPath}>
                {currentPath.split(/[\\/]/).pop()}
              </p>
            </div>
            
            <nav className="space-y-1">
              <SidebarItem 
                label="Status" 
                active={activeTab === 'Status' || activeTab === 'Changes'} 
                icon={<LayoutDashboard className="size-4" />} 
                onClick={() => onTabChange('Status')}
              />
              <SidebarItem 
                label="History" 
                active={activeTab === 'History'} 
                icon={<History className="size-4" />} 
                onClick={() => onTabChange('History')}
              />
              <SidebarItem 
                label="Publish" 
                active={activeTab === 'Publish'} 
                icon={<Rocket className="size-4" />} 
                onClick={() => onTabChange('Publish')}
              />
              <SidebarItem 
                label="Settings" 
                active={activeTab === 'Settings'} 
                icon={<Settings className="size-4" />} 
                onClick={() => onTabChange('Settings')}
              />
            </nav>
          </div>
        ) : (
          <div className="text-center mt-10 p-4">
            <div className="bg-gray-900/30 rounded-lg p-4 border border-dashed border-gray-800">
               <p className="text-xs text-gray-500 italic">Open a repository to get started</p>
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-gray-800 bg-gray-950/50 mt-auto">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          Git Core Ready
        </div>
      </div>
    </div>
  )
}

const SidebarItem: React.FC<{ label: string; active?: boolean; icon: React.ReactNode; onClick: () => void }> = ({ label, active, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all group relative",
      active 
        ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20" 
        : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
    )}
  >
    <span className={cn(
      "transition-colors",
      active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
    )}>
      {icon}
    </span>
    <span className="text-sm">{label}</span>
    {active && (
       <div className="absolute right-2 w-1 h-3 rounded-full bg-blue-500" />
    )}
  </button>
)

// --- Terminal Component ---
interface TerminalProps {
  logs: string[]
  onRunCommand?: (command: string) => void
  onClear?: () => void
  isVisible: boolean
  onToggle: () => void
}

const Terminal: React.FC<TerminalProps> = ({ logs, onRunCommand, onClear, isVisible, onToggle }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [command, setCommand] = React.useState('')

  useEffect(() => {
    if (isVisible) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isVisible])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && onRunCommand) {
      onRunCommand(command)
      setCommand('')
    }
  }

  return (
    <div className={cn(
      "bg-gray-950 border-t border-gray-800 flex flex-col font-mono transition-all duration-500 ease-in-out overflow-hidden relative",
      isVisible ? "h-72 opacity-100" : "h-0 opacity-0 border-t-0"
    )}>
      <div className="bg-gray-900/50 px-4 py-1.5 border-b border-gray-800 flex justify-between items-center text-gray-400 uppercase tracking-widest text-[10px] font-bold shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-3 text-blue-500" />
          <span>Output Console</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
            className="h-5 px-2 text-[10px] hover:text-white hover:bg-gray-800 transition-colors gap-1.5 font-bold"
          >
            <Eraser className="size-3" />
            Clear
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className="h-5 px-2 text-[10px] hover:text-white hover:bg-gray-800 transition-colors font-bold"
            title="Hide Terminal"
          >
            <ChevronRight className="size-3 rotate-90" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-1.5 custom-scrollbar text-[11px]">
          {logs.length === 0 ? (
            <p className="text-gray-700 italic opacity-50"># Terminal is empty, waiting for output...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-300 whitespace-pre-wrap leading-relaxed flex gap-2">
                <span className="text-gray-600 select-none shrink-0">$</span>
                <span className="flex-1">{log}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="border-t border-gray-800 bg-gray-900/30 p-2 flex gap-3 items-center group shrink-0">
        <div className="flex items-center gap-1.5 ml-2 text-blue-500 font-bold text-xs select-none">
          <span>git</span>
          <ChevronRight className="size-3 opacity-50" />
        </div>
        <input 
          type="text" 
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="type your command here (e.g. status)"
          className="bg-transparent border-none outline-none text-gray-300 flex-1 placeholder:text-gray-700 text-xs"
        />
        <Button 
          type="submit"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-gray-500 hover:text-blue-400 uppercase tracking-widest font-black px-4 transition-colors hover:bg-blue-500/5"
        >
          Execute
        </Button>
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
  const [isTerminalVisible, setIsTerminalVisible] = React.useState(true)

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans border border-gray-800 rounded-lg shadow-2xl">
      <TitleBar onSelectFolder={onSelectFolder} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          currentPath={currentPath} 
          onSelectFolder={onSelectFolder} 
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 bg-gray-950/50">
            <div className="p-8">
              {children}
            </div>
          </ScrollArea>
          
          <Terminal 
            logs={terminalOutput} 
            onRunCommand={onRunCommand} 
            onClear={onClearTerminal} 
            isVisible={isTerminalVisible}
            onToggle={() => setIsTerminalVisible(false)}
          />

          {!isTerminalVisible && (
            <button 
              onClick={() => setIsTerminalVisible(true)}
              className="absolute bottom-4 right-8 z-50 bg-gray-900/90 hover:bg-blue-600 border border-gray-800 hover:border-blue-500 p-3 rounded-2xl shadow-2xl transition-all group animate-in slide-in-from-bottom-4 duration-300"
              title="Show Terminal"
            >
              <TerminalIcon className="size-5 text-gray-400 group-hover:text-white transition-colors" />
              <div className="absolute -top-1 -right-1 size-2 bg-blue-500 rounded-full animate-pulse"></div>
            </button>
          )}
        </main>
      </div>
      <UpdateStatus />
    </div>
  )
}

export default Layout
