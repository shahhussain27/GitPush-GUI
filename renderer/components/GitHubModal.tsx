import React, { useState } from 'react'

interface GitHubModalProps {
  isOpen: boolean
  onClose: () => void
  folderName: string
  onCreate: (token: string, name: string, isPrivate: boolean) => Promise<{ success: boolean; error?: string }>
}

const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose, folderName, onCreate }) => {
  const [token, setToken] = useState('')
  const [repoName, setRepoName] = useState(folderName)
  const [isPrivate, setIsPrivate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('PAT is required')
      return
    }
    setError('')
    setIsSubmitting(true)
    
    const result = await onCreate(token, repoName, isPrivate)
    setIsSubmitting(false)
    
    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to create repository')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-500/10 animate-in zoom-in-95 duration-300">
        <div className="px-8 pt-8 pb-6 border-b border-gray-800/50 bg-gray-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/10 p-2 rounded-lg">
              <span className="text-xl">🐙</span>
            </div>
            <h2 className="text-xl font-bold text-white">Create GitHub Repo</h2>
          </div>
          <p className="text-gray-400 text-xs">Transform your local project into a GitHub repository.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex justify-between">
              GitHub Personal Access Token
              <a 
                href="https://github.com/settings/tokens/new?scopes=repo" 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-400 hover:underline lowercase font-normal"
              >
                Get Token
              </a>
            </label>
            <input 
              type="password" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Repository Name</label>
            <input 
              type="text" 
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-awesome-project"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-white"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800/50">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Visibility</span>
              <p className="text-xs text-gray-400">{isPrivate ? 'Private Repository' : 'Public Repository'}</p>
            </div>
            <button 
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isPrivate ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium animate-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-800 text-gray-400 text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${
                isSubmitting 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GitHubModal
