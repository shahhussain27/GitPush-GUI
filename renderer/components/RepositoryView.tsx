import React, { useState, useEffect } from 'react'
import GitHubModal from './GitHubModal'
import RemoteUpdateModal from './RemoteUpdateModal'
import CollaborationView from './CollaborationView'
import {
  GitBranch,
  Download,
  Upload,
  Save,
  Activity,
  Boxes,
  FileCode,
  Globe,
  Users,
  AlertCircle,
  CheckCircle,
  Wand2,
  RefreshCw,
  Tractor,
  HardDrive,
  Rocket
} from 'lucide-react'
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

interface RepositoryViewProps {
  currentPath: string
  status: string
  branch: string
  isRepo: boolean
  onInit: () => void
  onClone?: (url: string, targetDirectory: string) => Promise<boolean>
  onCommit: (message: string) => void
  onPush: () => void
  onPull: () => void
  isLoading?: boolean
  currentError?: any | null
  onApplyFix?: (command: string) => void
  onGitHubCreate?: (token: string, name: string, isPrivate: boolean) => Promise<{ success: boolean; error?: string }>
  onRemoveRemote?: (name: string) => void
  remoteStatus?: { ahead: number; behind: number; metadata: any | null }

  // Merge Conflict Props
  conflictedFiles?: string[]
  onAbortRebase?: () => Promise<void>
  onContinueRebase?: () => Promise<void>
  onResolveConflict?: (file: string, strategy: 'ours' | 'theirs') => Promise<void>

  // Collaboration props
  onListCollaborators?: (token: string, owner: string, repo: string) => Promise<{ success: boolean; collaborators?: any[]; error?: string }>
  onAddCollaborator?: (token: string, owner: string, repo: string, username: string, permission: string) => Promise<{ success: boolean; error?: string }>
  onRemoveCollaborator?: (token: string, owner: string, repo: string, username: string) => Promise<{ success: boolean; error?: string }>
  onGetRepoDetails?: (token: string, owner: string, repo: string) => Promise<{ success: boolean; details?: any; error?: string }>
  onAddTeamRepo?: (token: string, org: string, team: string, owner: string, repo: string, permission: string) => Promise<{ success: boolean; error?: string }>
  githubPat?: string
  setGithubPat?: (token: string) => Promise<void>
  deleteGithubPat?: () => Promise<void>
}

const RepositoryView: React.FC<RepositoryViewProps> = ({
  currentPath, status, branch, isRepo, onInit, onClone, onCommit, onPush, onPull, isLoading, currentError, onApplyFix, onGitHubCreate, onRemoveRemote, remoteStatus,
  conflictedFiles = [], onAbortRebase, onContinueRebase, onResolveConflict,
  onListCollaborators, onAddCollaborator, onRemoveCollaborator, onGetRepoDetails, onAddTeamRepo, githubPat, setGithubPat, deleteGithubPat
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'lfs' | 'gitignore' | 'remotes' | 'collaboration'>('status')
  const [commitMessage, setCommitMessage] = useState('')
  const [gitignoreContent, setGitignoreContent] = useState('')
  const [isLFSInstalled, setIsLFSInstalled] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState('')
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)
  const [hasOrigin, setHasOrigin] = useState(false)
  const [originUrl, setOriginUrl] = useState('')
  const [remotes, setRemotes] = useState('')
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false)
  const [initMode, setInitMode] = useState<'init' | 'clone'>('init')
  const [cloneUrl, setCloneUrl] = useState('')

  const isBehind = (remoteStatus?.behind || 0) > 0

  useEffect(() => {
    if (isRepo) {
      checkLFS()
      loadGitignore()
      checkRemotes()
    }
  }, [isRepo, currentPath])

  useEffect(() => {
    if (isBehind) {
      setIsRemoteModalOpen(true)
    }
  }, [isBehind])

  const checkRemotes = async () => {
    const r = await window.ipc.invoke('git:remotes')
    const remotesStr = r as string
    setRemotes(remotesStr)
    setHasOrigin(remotesStr.includes('origin'))
    if (remotesStr.includes('origin')) {
      const line = remotesStr.split('\n').find(l => l.startsWith('origin'))
      if (line) {
        const urlMatch = line.match(/\s+(.*)\s+\(/)
        if (urlMatch) setOriginUrl(urlMatch[1])
      }
    }
  }

  const checkLFS = async () => {
    const installed = await window.ipc.invoke('lfs:is-installed')
    setIsLFSInstalled(installed as boolean)
  }

  const loadGitignore = async () => {
    const content = await window.ipc.invoke('gitignore:read', currentPath)
    setGitignoreContent(content as string)
  }

  const saveGitignore = async () => {
    await window.ipc.invoke('gitignore:save', currentPath, gitignoreContent)
    alert('Gitignore saved!')
  }

  const generateGitignore = async (type: string) => {
    await window.ipc.invoke('gitignore:generate', currentPath, type)
    await loadGitignore()
  }

  if (!isRepo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
          <div className="flex text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-950/50 border-b border-gray-800/50">
            <button
              onClick={() => setInitMode('init')}
              className={cn("flex-1 py-4 hover:text-white transition-colors border-b-2", initMode === 'init' ? "border-blue-500 text-white bg-blue-500/5" : "border-transparent")}
            >
              Initialize Local
            </button>
            <button
              onClick={() => setInitMode('clone')}
              className={cn("flex-1 py-4 hover:text-white transition-colors border-b-2", initMode === 'clone' ? "border-blue-500 text-white bg-blue-500/5" : "border-transparent")}
            >
              Clone Remote
            </button>
          </div>
          <div className="p-10 space-y-8">
            {initMode === 'init' ? (
              <div className="space-y-6">
                <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Tractor className="size-10 text-blue-500" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black text-white">Initialize Workspace</h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                    This folder isn't under version control yet. Transform it into a Git repository to start tracking changes.
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <Button
                    size="lg"
                    onClick={onInit}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 shadow-lg shadow-blue-900/40 gap-3 rounded-2xl"
                  >
                    <GitBranch className="size-5" />
                    Init Git Repository
                  </Button>
                  <p className="text-[10px] text-gray-600 font-mono tracking-tighter">EXECUTE: git init</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-left">
                <div className="space-y-3 mb-8 text-center border-b border-gray-800/50 pb-8">
                  <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="size-10 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white">Clone Repository</h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                    Download an existing project from GitHub, GitLab, or any Git remote into the current folder.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Repository URL</label>
                    <input
                      type="text"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono placeholder:text-gray-800"
                    />
                  </div>
                  <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 text-xs text-blue-400/80 font-medium">
                    This will clone the repository into <span className="font-mono text-white/90">{currentPath}</span>. If the repository creates a new folder, you may need to open that new folder afterwards.
                  </div>
                  <Button
                    size="lg"
                    disabled={!cloneUrl}
                    onClick={() => {
                      if (onClone && cloneUrl) {
                        onClone(cloneUrl, currentPath)
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 shadow-lg shadow-blue-900/40 gap-3 rounded-2xl mt-4"
                  >
                    <Download className="size-5" />
                    Clone Repository
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-6 max-w-6xl mx-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-gray-950/70 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-800 p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
              <Activity className="size-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-white font-black text-lg">Syncing Git</p>
            <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">Please wait...</p>
          </div>
        </div>
      )}

      {/* Error / Smart Fix System */}
      {currentError && (
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <AlertCircle className="size-24 text-red-500" />
          </div>
          <div className="flex items-start gap-5 relative z-10">
            <div className="bg-red-500 p-2.5 rounded-xl shadow-lg shadow-red-900/20 shrink-0">
              <AlertCircle className="size-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-red-400 font-black text-lg mb-1">Git Error Encountered</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium">
                {currentError.message}
              </p>

              {currentError.safeFixAvailable && currentError.fixCommand && (
                <div className="space-y-4">
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800/50 font-mono text-[11px] text-blue-400 flex items-center gap-3">
                    <span className="text-gray-600 shrink-0">$</span>
                    {currentError.fixCommand}
                  </div>
                  <Button
                    onClick={() => onApplyFix?.(currentError.fixCommand)}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold gap-2 shadow-lg shadow-green-900/20"
                  >
                    <Wand2 className="size-4" />
                    Apply Smart Fix
                  </Button>
                </div>
              )}

              {currentError.requiresUserDecision && (
                <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-4">
                  <Activity className="size-3" />
                  Manual intervention required
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merge Conflict Resolution Banner */}
      {conflictedFiles.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl animate-in fade-in duration-500 mb-6">
          <div className="flex items-start gap-5">
            <div className="bg-amber-500 p-2.5 rounded-xl shadow-lg shadow-amber-900/20 shrink-0">
              <AlertCircle className="size-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-500 font-black text-lg mb-2">Merge Conflict Detected</h3>
              <p className="text-amber-400/80 text-sm mb-4">
                The current operation resulted in conflicts. You must resolve these before continuing.
              </p>

              <div className="space-y-4 mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">Conflicted Files</h4>
                <div className="bg-gray-950/50 rounded-xl overflow-hidden border border-amber-500/20">
                  {conflictedFiles.map(file => (
                    <div key={file} className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-amber-500/10 last:border-b-0 gap-4">
                      <span className="text-amber-200 font-mono text-sm break-all">{file}</span>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => onResolveConflict?.(file, 'ours')}
                          className="bg-gray-800 hover:bg-gray-700 text-xs h-8 text-amber-500 border border-amber-500/30"
                        >
                          Keep Ours (Current)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onResolveConflict?.(file, 'theirs')}
                          className="bg-gray-800 hover:bg-gray-700 text-xs h-8 text-amber-500 border border-amber-500/30"
                        >
                          Keep Theirs (Incoming)
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 border-t border-amber-500/20 pt-6">
                <Button
                  onClick={onContinueRebase}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold h-12 flex-1"
                >
                  <Wand2 className="size-4 mr-2" />
                  Continue After Resolving
                </Button>
                <Button
                  variant="outline"
                  onClick={onAbortRebase}
                  className="bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold h-12 flex-1"
                >
                  Abort Merge
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-gray-900/40 p-5 rounded-2xl border border-gray-800/50 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
              <GitBranch className="size-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Active Development Branch</h2>
              <div className="flex items-center gap-2">
                <p className="text-xl font-mono font-black text-white">
                  {branch || 'master'}
                </p>
                <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 font-black px-1.5 h-4">LOCAL</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPull}
            disabled={!hasOrigin}
            className={cn(
              "flex-1 h-full rounded-2xl text-sm border-2 font-black gap-2 transition-all",
              !hasOrigin ? 'opacity-50 cursor-not-allowed' : '',
              isBehind
                ? 'bg-amber-600/10 hover:bg-amber-600/20 border-amber-500 text-amber-500 animate-pulse'
                : 'bg-gray-900/40 hover:bg-gray-800 border-gray-800 text-gray-300'
            )}
          >
            <Download className="size-5" />
            {!hasOrigin ? 'No Remote' : (isBehind ? 'Pull Required' : 'Sync Pull')}
          </Button>
          <Button
            disabled={isBehind || !hasOrigin}
            onClick={onPush}
            className={cn(
              "flex-1 h-full rounded-2xl text-sm font-black gap-2 shadow-xl transition-all",
              (isBehind || !hasOrigin)
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed grayscale'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white'
            )}
          >
            <Upload className="size-5" />
            {!hasOrigin ? 'No Remote' : 'Push Changes'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800/50 gap-10 px-4 overflow-x-auto custom-scrollbar no-scrollbar">
        <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} label="Status & Commit" icon={<Activity className="size-4" />} />
        <TabButton active={activeTab === 'lfs'} onClick={() => setActiveTab('lfs')} label="Git LFS" icon={<Boxes className="size-4" />} />
        <TabButton active={activeTab === 'gitignore'} onClick={() => setActiveTab('gitignore')} label=".gitignore" icon={<FileCode className="size-4" />} />
        <TabButton active={activeTab === 'remotes'} onClick={() => setActiveTab('remotes')} label="Remotes" icon={<Globe className="size-4" />} />
        <TabButton active={activeTab === 'collaboration'} onClick={() => setActiveTab('collaboration')} label="Collaboration" icon={<Users className="size-4" />} />
      </div>

      <div className="min-h-[450px]">
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="lg:col-span-2 bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden flex flex-col shadow-2xl relative">
              <div className="px-6 py-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 flex justify-between items-center z-10 sticky top-0">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-blue-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Working Directory Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[9px] text-blue-400 font-black uppercase">Live Monitoring</span>
                </div>
              </div>
              <div className="p-6 font-mono text-xs text-gray-300 overflow-auto bg-gray-950/30 h-[400px] custom-scrollbar selection:bg-blue-500/30">
                {status ? (
                  <pre className="whitespace-pre-wrap leading-relaxed">{status}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="bg-gray-800/30 p-6 rounded-full">
                      <CheckCircle className="size-12 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Nothing to commit</h4>
                      <p className="text-gray-500 text-[10px] uppercase tracking-tighter mt-1">Working tree is completely clean</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Save className="size-5 text-green-500" />
                  </div>
                  Snap Status
                </h3>
                <div className="relative">
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Describe your progress..."
                    className="w-full h-52 bg-gray-950/50 border border-gray-700/50 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none resize-none mb-4 transition-all placeholder:text-gray-700 font-medium text-white scrollbar-hide"
                  />
                  <div className="absolute bottom-6 right-4 text-[10px] font-bold text-gray-600">
                    {commitMessage.length} chars
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Button
                  disabled={!commitMessage}
                  onClick={() => {
                    onCommit(commitMessage)
                    setCommitMessage('')
                  }}
                  className={cn(
                    "w-full h-12 rounded-2xl font-black transition-all gap-2 text-sm shadow-lg",
                    commitMessage
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  )}
                >
                  <Rocket className="size-4" />
                  Commit & Record
                </Button>
                <div className="flex items-center justify-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center px-4">
                  <Separator className="flex-1 bg-gray-800" />
                  <span>Runs: git add . && git commit</span>
                  <Separator className="flex-1 bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lfs' && (
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 opacity-5 scale-150 rotate-12">
              <Boxes className="size-64 text-blue-500" />
            </div>
            <div className="flex items-start gap-8 max-w-3xl relative z-10">
              <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20 shadow-xl">
                <Boxes className="size-10 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-3">Git Large File Storage</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                  Git LFS replaces large files such as audio samples, videos, and datasets with text pointers
                  inside Git, storing contents on a remote server. Recommended for files &gt;50MB.
                </p>

                {!isLFSInstalled ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-red-400 text-xs mb-8 flex items-center gap-4 font-bold uppercase tracking-widest">
                    <AlertCircle className="size-5" />
                    System Check: Git LFS NOT detected
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl text-green-400 text-xs mb-8 flex items-center gap-4 font-bold uppercase tracking-widest">
                    <CheckCircle className="size-5" />
                    System Check: LFS Active and Ready
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await window.ipc.invoke('lfs:install')
                      checkLFS()
                    }}
                    className="h-12 bg-gray-900/50 hover:bg-gray-800 border-2 border-gray-800 rounded-2xl text-sm font-black transition-all gap-2"
                  >
                    <Download className="size-4" />
                    Initialize LFS
                  </Button>
                  <Button
                    onClick={() => {
                      const pattern = prompt('Enter file pattern to track (e.g. *.png, assets/*):')
                      if (pattern) {
                        window.ipc.invoke('lfs:track', pattern)
                      }
                    }}
                    className="h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-900/20 gap-2"
                  >
                    <Activity className="size-4" />
                    Track Patterns
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gitignore' && (
          <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="px-8 py-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 flex justify-between items-center z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <FileCode className="size-5 text-gray-400" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exclusion manifests (.gitignore)</span>
              </div>
              <div className="flex gap-3">
                <select
                  onChange={(e) => generateGitignore(e.target.value)}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-1.5 text-[10px] text-gray-300 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-black uppercase tracking-tighter"
                  defaultValue=""
                >
                  <option value="" disabled>Standard Templates</option>
                  <option value="web">Next.js / Node.js</option>
                  <option value="unity">Unity / Game Dev</option>
                  <option value="generic">Minimal / Generic</option>
                </select>
                <Button
                  size="sm"
                  onClick={saveGitignore}
                  className="bg-green-600 hover:bg-green-500 text-white font-black text-[10px] rounded-xl px-5 uppercase tracking-widest shadow-lg shadow-green-900/20"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
            <textarea
              value={gitignoreContent}
              onChange={(e) => setGitignoreContent(e.target.value)}
              className="w-full h-[450px] bg-gray-950/40 p-8 font-mono text-xs text-gray-300 outline-none resize-none leading-relaxed custom-scrollbar selection:bg-blue-500/30"
              spellCheck={false}
            />
          </div>
        )}

        {activeTab === 'remotes' && (
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="size-6 text-blue-500" />
              <h3 className="text-xl font-black text-white">Upstream Control</h3>
            </div>

            {hasOrigin ? (
              <div className="space-y-8">
                <div className="bg-blue-600/5 border border-blue-600/10 p-8 rounded-3xl flex justify-between items-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <Globe className="size-20 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-900/20">
                      <Globe className="size-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Primary Remote</h4>
                        <Badge className="bg-blue-500/20 text-blue-400 border-none text-[8px] font-black h-4 px-1.5 uppercase tracking-tighter">origin</Badge>
                      </div>
                      <p className="text-lg font-mono font-bold text-white tracking-tight">{originUrl}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (confirm('Are you sure you want to remove this remote?')) {
                        onRemoveRemote?.('origin')
                        await checkRemotes()
                      }
                    }}
                    className="relative z-10 px-6 h-12 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-2xl text-xs font-black transition-all border border-red-500/20 uppercase tracking-widest"
                  >
                    Disconnect
                  </Button>
                </div>

                <div className="bg-gray-950/50 rounded-2xl p-6 border border-gray-800/50 font-mono text-xs text-gray-400 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-600 tracking-[0.2em]">
                    <Activity className="size-3" /> Raw Transport Details
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed opacity-60">
                    {remotes}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Configure Uplink</h4>
                  <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl">
                    <p className="text-xs text-blue-400/80 leading-relaxed font-medium italic">
                      💡 Connect your local project to a remote server. Enter the SSH or HTTPS URL provided by your Git hosting service.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Remote Repository Address</label>
                      <input
                        type="text"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        placeholder="https://github.com/vibe/nova-core.git"
                        className="w-full bg-gray-950/50 border border-gray-700/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-white font-mono placeholder:text-gray-800"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!remoteUrl) return
                        await window.ipc.invoke('git:add-remote', 'origin', remoteUrl)
                        setRemoteUrl('')
                        await checkRemotes()
                      }}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 text-sm uppercase tracking-widest"
                    >
                      Establish Connection
                    </Button>

                    <Separator className="bg-gray-800/50 my-6" />

                    <Button
                      onClick={() => setIsGitHubModalOpen(true)}
                      className="w-full h-12 bg-white hover:bg-gray-100 text-gray-950 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-3 text-sm"
                    >
                      <Globe className="size-5" />
                      Auto-Create via GitHub API
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-950/10 group hover:border-blue-500/20 transition-all duration-700">
                  <div className="bg-gray-800/30 w-24 h-24 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="size-10 text-gray-700 group-hover:text-blue-500/50 transition-colors" />
                  </div>
                  <h4 className="text-lg font-black text-gray-500 mb-2 uppercase tracking-tighter">Isolated Environment</h4>
                  <p className="text-xs text-gray-600 max-w-[240px] leading-relaxed font-medium">Your work is currently local only. Connect to a remote to enable cloud synchronization.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaboration' && (
          <CollaborationView
            currentPath={currentPath}
            onListCollaborators={onListCollaborators!}
            onAddCollaborator={onAddCollaborator!}
            onRemoveCollaborator={onRemoveCollaborator!}
            onGetRepoDetails={onGetRepoDetails!}
            onAddTeamRepo={onAddTeamRepo!}
            githubPat={githubPat}
            setGithubPat={setGithubPat}
            deleteGithubPat={deleteGithubPat}
          />
        )}
      </div>

      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        folderName={currentPath.split(/[\\/]/).pop() || ''}
        onCreate={onGitHubCreate || (async () => ({ success: false, error: 'GitHub module not connected' }))}
      />

      <RemoteUpdateModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        onPull={() => {
          onPull()
          setIsRemoteModalOpen(false)
        }}
        behindCount={remoteStatus?.behind || 0}
        metadata={remoteStatus?.metadata}
      />
    </div>
  )
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={cn(
      "py-5 text-[10px] font-black border-b-[3px] transition-all px-2 flex items-center gap-2 uppercase tracking-widest",
      active
        ? "border-blue-500 text-white"
        : "border-transparent text-gray-500 hover:text-gray-300"
    )}
  >
    {icon}
    {label}
  </button>
)

export default RepositoryView
