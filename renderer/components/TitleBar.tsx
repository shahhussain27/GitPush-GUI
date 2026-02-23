import Image from 'next/image'
import React, { useState } from 'react'
import { 
  File, 
  Monitor, 
  Play, 
  Terminal as TerminalIcon, 
  HelpCircle, 
  Minus, 
  Square, 
  X,
  FileCode,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Bug,
  Plus,
  Rows,
  RefreshCw,
  Info
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"

interface TitleBarProps {
  onSelectFolder?: () => void
}

const TitleBar: React.FC<TitleBarProps> = ({ onSelectFolder }) => {
  const handleMinimize = () => window.ipc.send('window:minimize', null)
  const handleMaximize = () => window.ipc.send('window:maximize', null)
  const handleClose = () => window.ipc.send('window:close', null)

  const handleOpenFile = async () => {
    await window.ipc.invoke('dialog:open-file')
  }

  const handleOpenFolder = async () => {
    if (onSelectFolder) {
      onSelectFolder()
    } else {
      await window.ipc.invoke('dialog:open-folder')
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 px-2">
                File
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-gray-300">
              <DropdownMenuItem onClick={handleOpenFile} className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <FileCode className="size-4" /> Open File...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenFolder} className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <FolderOpen className="size-4" /> Open Folder...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 px-2">
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-gray-300">
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <ZoomIn className="size-4" /> Zoom In
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <ZoomOut className="size-4" /> Zoom Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 px-2">
                Run
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-gray-300">
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <Bug className="size-4" /> Start Debugging
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <Play className="size-4" /> Run Without Debugging
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 px-2">
                Terminal
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-gray-300">
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <Plus className="size-4" /> New Terminal
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <Rows className="size-4" /> Split Terminal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 px-2">
                Help
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-gray-300">
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <RefreshCw className="size-4" /> Check for Updates
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 focus:bg-blue-600 focus:text-white">
                <Info className="size-4" /> About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full no-drag">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleMinimize}
          className="h-full w-12 rounded-none text-gray-500 hover:bg-gray-800 hover:text-white transition-colors border-none shadow-none"
        >
          <Minus className="size-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleMaximize}
          className="h-full w-12 rounded-none text-gray-500 hover:bg-gray-800 hover:text-white transition-colors border-none shadow-none"
        >
          <Square className="size-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleClose}
          className="h-full w-12 rounded-none text-gray-500 hover:bg-[#ff0000] hover:text-white transition-colors border-none shadow-none"
          title="Close"
        >
          <X className="size-4" />
        </Button>
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

export default TitleBar
