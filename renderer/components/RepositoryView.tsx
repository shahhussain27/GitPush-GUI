import React, { useState, useEffect } from 'react'
import GitHubModal from './GitHubModal'
import RemoteUpdateModal from './RemoteUpdateModal'
import CollaborationView from './CollaborationView'

interface RepositoryViewProps {
  currentPath: string
  status: string
  branch: string
  isRepo: boolean
  onInit: () => void
  onCommit: (message: string) => void
  onPush: () => void
  onPull: () => void
  isLoading?: boolean
  currentError?: any | null
  onApplyFix?: (command: string) => void
  onGitHubCreate?: (token: string, name: string, isPrivate: boolean) => Promise<{ success: boolean; error?: string }>
  onRemoveRemote?: (name: string) => void
  remoteStatus?: { ahead: number; behind: number; metadata: any | null }
  
  // Collaboration props
  onListCollaborators?: (token: string, owner: string, repo: string) => Promise<{ success: boolean; collaborators?: any[]; error?: string }>
  onAddCollaborator?: (token: string, owner: string, repo: string, username: string, permission: string) => Promise<{ success: boolean; error?: string }>
  onRemoveCollaborator?: (token: string, owner: string, repo: string, username: string) => Promise<{ success: boolean; error?: string }>
  onGetRepoDetails?: (token: string, owner: string, repo: string) => Promise<{ success: boolean; details?: any; error?: string }>
  onAddTeamRepo?: (token: string, org: string, team: string, owner: string, repo: string, permission: string) => Promise<{ success: boolean; error?: string }>
}

const RepositoryView: React.FC<RepositoryViewProps> = ({ 
  currentPath, status, branch, isRepo, onInit, onCommit, onPush, onPull, isLoading, currentError, onApplyFix, onGitHubCreate, onRemoveRemote, remoteStatus,
  onListCollaborators, onAddCollaborator, onRemoveCollaborator, onGetRepoDetails, onAddTeamRepo
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'lfs' | 'gitignore' | 'remotes' | 'collaboration'>('status')
  const [commitMessage, setCommitMessage] = useState('')
  const [gitignoreContent, setGitignoreContent] = useState('')
  const [isLFSInstalled, setIsLFSInstalled] = useState(false)
  const [lfsStatus, setLfsStatus] = useState('')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)
  const [hasOrigin, setHasOrigin] = useState(false)
  const [originUrl, setOriginUrl] = useState('')
  const [remotes, setRemotes] = useState('')
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false)

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
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
        <div className="bg-gray-900 p-10 rounded-2xl border border-gray-800 shadow-2xl max-w-lg">
          <div className="text-5xl mb-6">🛠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Setup Repository</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            This folder is not a Git repository. To start versioning your files and pushing to the cloud, you need to initialize it.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={onInit}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/40"
            >
              Initialize Git Repository
            </button>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Runs: git init</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-6 max-w-6xl mx-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-gray-950/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white font-bold">Processing Git Command...</p>
            <p className="text-gray-500 text-xs mt-2">Check the console below for details</p>
          </div>
        </div>
      )}

      {/* Error / Smart Fix System */}
      {currentError && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-4">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-red-400 font-bold mb-1">Git Error Detected</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {currentError.message}
              </p>
              
              {currentError.safeFixAvailable && currentError.fixCommand && (
                <div className="flex flex-col gap-3">
                  <div className="bg-black/40 p-3 rounded-lg border border-gray-800 font-mono text-xs text-green-400">
                    Suggested Fix: {currentError.fixCommand}
                  </div>
                  <button 
                    onClick={() => onApplyFix?.(currentError.fixCommand)}
                    className="w-fit px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
                  >
                    <span>🛠️</span> Fix Automatically
                  </button>
                </div>
              )}

              {currentError.requiresUserDecision && (
                <p className="text-xs text-gray-500 italic mt-2">
                  ℹ️ This error requires manual intervention. Check the "Status & Commit" tab or technical logs for more info.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-center bg-gray-900/50 p-5 rounded-xl border border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <span className="text-xl">🌿</span>
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-0.5">Active Branch</h2>
            <p className="text-lg font-mono font-bold text-white">
              {branch || 'master'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onPull} className={`px-4 py-2 rounded-lg text-sm transition-all border font-medium flex items-center gap-2 ${
            isBehind 
            ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/30' 
            : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
          }`}>
            <span>⬇️</span> {isBehind ? 'Pull & Rebase Required' : 'Pull'}
          </button>
          <button 
            disabled={isBehind}
            onClick={onPush} 
            className={`px-5 py-2 rounded-lg text-sm transition-all font-bold shadow-lg flex items-center gap-2 ${
              isBehind 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
            }`}
          >
            <span>⬆️</span> Push to Remote
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-8 px-2">
        <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} label="Status & Commit" />
        <TabButton active={activeTab === 'lfs'} onClick={() => setActiveTab('lfs')} label="Git LFS" />
        <TabButton active={activeTab === 'gitignore'} onClick={() => setActiveTab('gitignore')} label=".gitignore" />
        <TabButton active={activeTab === 'remotes'} onClick={() => setActiveTab('remotes')} label="Remotes" />
        <TabButton active={activeTab === 'collaboration'} onClick={() => setActiveTab('collaboration')} label="Collaboration" />
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col shadow-xl">
              <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-800 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Changes</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Auto-refresh: 5s</span>
              </div>
              <div className="p-4 font-mono text-xs text-gray-300 overflow-auto bg-gray-950/20 h-[350px]">
                {status ? (
                  <pre className="whitespace-pre-wrap leading-relaxed">{status}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <span className="text-3xl mb-2">✨</span>
                    <p>Clean working tree</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-green-500">💾</span> Commit Changes
                </h3>
                <textarea 
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="What did you change? (e.g. Added login screen)"
                  className="w-full h-48 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none mb-4 transition-all placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-3">
                <button 
                  disabled={!commitMessage}
                  onClick={() => {
                    onCommit(commitMessage)
                    setCommitMessage('')
                  }}
                  className={`w-full py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                    commitMessage 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  }`}
                >
                  🚀 Commit and Stage
                </button>
                <p className="text-[10px] text-center text-gray-500">Stages all files (.) before committing</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lfs' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-start gap-6 max-w-3xl">
              <div className="text-4xl">📦</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Git Large File Storage (LFS)</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Git LFS replaces large files such as audio samples, videos, datasets, and graphics with text pointers 
                  inside Git, while storing the file contents on a remote server. Usually recommended for files &gt;50MB.
                </p>
                
                {!isLFSInstalled ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-400 text-sm mb-6 flex items-center gap-3">
                    <span>⚠️</span> Git LFS is not installed on this system or project.
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-green-400 text-sm mb-6 flex items-center gap-3">
                    <span>✅</span> Git LFS is initialized for this project.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={async () => {
                      await window.ipc.invoke('lfs:install')
                      checkLFS()
                    }}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold border border-gray-700 transition-all"
                  >
                    Initialize LFS
                  </button>
                  <button 
                    onClick={() => {
                      const pattern = prompt('Enter file pattern to track (e.g. *.png, assets/*):')
                      if (pattern) {
                        window.ipc.invoke('lfs:track', pattern)
                      }
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                  >
                    Track Patterns (*.psd, *.zip)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gitignore' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col shadow-xl animate-in fade-in duration-300">
            <div className="px-6 py-3 bg-gray-800/30 border-b border-gray-800 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Edit .gitignore</span>
              <div className="flex gap-2">
                <select 
                  onChange={(e) => generateGitignore(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>Generate from template...</option>
                  <option value="web">Web (Node/Next)</option>
                  <option value="unity">Unity</option>
                  <option value="generic">Generic</option>
                </select>
                <button 
                  onClick={saveGitignore}
                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition-all"
                >
                  Save
                </button>
              </div>
            </div>
            <textarea 
              value={gitignoreContent}
              onChange={(e) => setGitignoreContent(e.target.value)}
              className="w-full h-[400px] bg-gray-950/50 p-6 font-mono text-xs text-gray-300 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {activeTab === 'remotes' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-white mb-4">Remote Management</h3>
            
            {hasOrigin ? (
              <div className="space-y-6">
                <div className="bg-blue-600/10 border border-blue-600/20 p-6 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-3 rounded-lg">
                      <span className="text-xl">🌍</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Current Remote: origin</h4>
                      <p className="text-sm font-mono text-white">{originUrl}</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm('Are you sure you want to remove this remote?')) {
                        onRemoveRemote?.('origin')
                        await checkRemotes()
                      }
                    }}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-bold transition-all border border-red-500/30"
                  >
                    🗑️ Remove & Reset
                  </button>
                </div>
                
                <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 font-mono text-xs text-blue-400">
                   <pre className="whitespace-pre-wrap leading-relaxed">
                     {/* Full remote details */}
                     {remotes}
                   </pre>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Add New Remote</h4>
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg mb-4">
                    <p className="text-xs text-blue-400 leading-relaxed italic">
                      💡 <strong>Tip:</strong> Most projects use "origin" as the name. 
                      Copy your remote URL from GitHub (HTTPS recommended) and paste it below.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase mb-1 block">Remote URL</label>
                      <input 
                        type="text" 
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        placeholder="https://github.com/user/repo.git"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white font-mono"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!remoteUrl) return
                        await window.ipc.invoke('git:add-remote', 'origin', remoteUrl)
                        setRemoteUrl('')
                        await checkRemotes()
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg mb-3"
                    >
                      Connect Existing Remote
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-gray-900 px-2 text-gray-500 font-bold">Or</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsGitHubModalOpen(true)}
                      className="w-full py-3 mt-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>🐙</span> Create New GitHub Repository
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-800 rounded-2xl">
                  <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                    <span className="text-3xl grayscale">☁️</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-400 mb-2">No Remote Found</h4>
                  <p className="text-xs text-gray-600 max-w-[200px]">Connect your project to GitHub to enable cloud backup and collaboration.</p>
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

const SyncRemotes: React.FC<{ currentPath: string; onData?: (data: string) => void }> = ({ currentPath, onData }) => {
  const [remotes, setRemotes] = useState('')
  
  useEffect(() => {
    const fetch = async () => {
      const r = await window.ipc.invoke('git:remotes')
      setRemotes(r as string)
      if (onData) onData(r as string)
    }
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [currentPath])

  return remotes ? <pre className="whitespace-pre-wrap">{remotes}</pre> : <p className="text-gray-600">No remotes configured.</p>
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`py-4 text-sm font-bold border-b-2 transition-all px-1 ${
      active 
      ? 'border-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' 
      : 'border-transparent text-gray-500 hover:text-gray-300'
    }`}
  >
    {label}
  </button>
)

export default RepositoryView
