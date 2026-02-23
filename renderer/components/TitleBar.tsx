import Image from 'next/image'
import React, { useState } from 'react'

interface TitleBarProps {
  onSelectFolder?: () => void
}

const TitleBar: React.FC<TitleBarProps> = ({ onSelectFolder }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const handleMinimize = () => window.ipc.send('window:minimize', null)
  const handleMaximize = () => window.ipc.send('window:maximize', null)
  const handleClose = () => window.ipc.send('window:close', null)

  const handleOpenFile = async () => {
    setActiveMenu(null)
    await window.ipc.invoke('dialog:open-file')
  }

  const handleOpenFolder = async () => {
    setActiveMenu(null)
    if (onSelectFolder) {
      onSelectFolder()
    } else {
      await window.ipc.invoke('dialog:open-folder')
    }
  }

  const toggleMenu = (menu: string) => {
    setActiveMenu(prev => prev === menu ? null : menu)
  }

  return (
    <div className="h-10 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800 flex items-center justify-between select-none px-4 drag-region z-[300]">
      <div className="flex items-center gap-4 no-drag">
        {/* App Title/Logo */}
        <div className="flex items-center gap-2 mr-2">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={24}
            height={24}
            className="object-contain"
          />
        </div>

        {/* Menu Items */}
        <div className="flex items-center gap-1">
          <MenuButton 
            label="File" 
            isOpen={activeMenu === 'File'} 
            onClick={() => toggleMenu('File')} 
          >
            <MenuItem label="Open File..." onClick={handleOpenFile} />
            <MenuItem label="Open Folder..." onClick={handleOpenFolder} />
          </MenuButton>

          <MenuButton label="View" isOpen={activeMenu === 'View'} onClick={() => toggleMenu('View')}>
            <MenuItem label="Zoom In" onClick={() => {}} />
            <MenuItem label="Zoom Out" onClick={() => {}} />
          </MenuButton>

          <MenuButton label="Run" isOpen={activeMenu === 'Run'} onClick={() => toggleMenu('Run')}>
            <MenuItem label="Start Debugging" onClick={() => {}} />
            <MenuItem label="Run Without Debugging" onClick={() => {}} />
          </MenuButton>

          <MenuButton label="Terminal" isOpen={activeMenu === 'Terminal'} onClick={() => toggleMenu('Terminal')}>
            <MenuItem label="New Terminal" onClick={() => setActiveMenu(null)} />
            <MenuItem label="Split Terminal" onClick={() => setActiveMenu(null)} />
          </MenuButton>

          <MenuButton label="Help" isOpen={activeMenu === 'Help'} onClick={() => toggleMenu('Help')}>
            <MenuItem label="Check for Updates" onClick={() => setActiveMenu(null)} />
            <MenuItem label="About" onClick={() => setActiveMenu(null)} />
          </MenuButton>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full no-drag">
        <button 
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
             <rect width="10" height="1" />
          </svg>
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
             <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button 
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center text-gray-500 hover:bg-[#ff0000] hover:text-white transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
             <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .drag-region {
          -webkit-app-region: drag;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
      `}</style>
    </div>
  )
}

const MenuButton: React.FC<{ label: string; isOpen: boolean; onClick: () => void, children?: React.ReactNode }> = ({ label, isOpen, onClick, children }) => (
  <div className="relative">
    <button 
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded transition-colors ${isOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
    >
      {label}
    </button>
    {isOpen && (
      <>
        <div className="fixed inset-0 z-10" onClick={onClick} />
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
          {children}
        </div>
      </>
    )}
  </div>
)

const MenuItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-blue-600 hover:text-white flex items-center gap-3 transition-colors"
  >
    {label}
  </button>
)

export default TitleBar
