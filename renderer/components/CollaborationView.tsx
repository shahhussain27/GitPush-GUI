import React, { useState, useEffect } from 'react'

interface Collaborator {
  login: string
  permissions: {
    admin: boolean
    push: boolean
    pull: boolean
    maintain?: boolean
    triage?: boolean
  }
  role_name: string
}

interface CollaborationViewProps {
  currentPath: string
  onListCollaborators: (token: string, owner: string, repo: string) => Promise<{ success: boolean; collaborators?: Collaborator[]; error?: string }>
  onAddCollaborator: (token: string, owner: string, repo: string, username: string, permission: string) => Promise<{ success: boolean; error?: string }>
  onRemoveCollaborator: (token: string, owner: string, repo: string, username: string) => Promise<{ success: boolean; error?: string }>
  onGetRepoDetails: (token: string, owner: string, repo: string) => Promise<{ success: boolean; details?: any; error?: string }>
  onAddTeamRepo: (token: string, org: string, team: string, owner: string, repo: string, permission: string) => Promise<{ success: boolean; error?: string }>
}

const CollaborationView: React.FC<CollaborationViewProps> = ({
  currentPath, onListCollaborators, onAddCollaborator, onRemoveCollaborator, onGetRepoDetails, onAddTeamRepo
}) => {
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isOrg, setIsOrg] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Form states
  const [newUsername, setNewUsername] = useState('')
  const [permission, setPermission] = useState('push')
  const [teamSlug, setTeamSlug] = useState('')

  useEffect(() => {
    // Try to extract owner/repo from remotes if possible
    const fetchRemotes = async () => {
      const r = await window.ipc.invoke('git:remotes')
      const remotesStr = r as string
      const line = remotesStr.split('\n').find(l => l.includes('github.com'))
      if (line) {
        const match = line.match(/github\.com[/:](.*)\/(.*)\.git/)
        if (match) {
          setOwner(match[1])
          setRepo(match[2])
        }
      }
    }
    fetchRemotes()
  }, [currentPath])

  const handleConnect = async () => {
    if (!token || !owner || !repo) {
      setMessage('Please provide PAT, Owner, and Repo name.')
      return
    }
    setIsLoading(true)
    setMessage('')
    try {
      const details = await onGetRepoDetails(token, owner, repo)
      if (details.success) {
        setIsOrg(details.details.owner.type === 'Organization')
        const collabs = await onListCollaborators(token, owner, repo)
        if (collabs.success) {
          setCollaborators(collabs.collaborators || [])
        } else {
          setMessage(`Error: ${collabs.error}`)
        }
      } else {
        setMessage(`Error: ${details.error}`)
      }
    } catch (e: any) {
      setMessage(`Connection failed: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCollaborator = async () => {
    if (!newUsername) return
    setIsLoading(true)
    const result = await onAddCollaborator(token, owner, repo, newUsername, permission)
    if (result.success) {
      setMessage(`✅ Invite sent to ${newUsername}`)
      setNewUsername('')
      handleConnect() // Refresh
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
    setIsLoading(false)
  }

  const handleRemoveCollaborator = async (username: string) => {
    if (!confirm(`Remove ${username} from repository?`)) return
    setIsLoading(true)
    const result = await onRemoveCollaborator(token, owner, repo, username)
    if (result.success) {
      setMessage(`✅ Removed ${username}`)
      handleConnect() // Refresh
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
    setIsLoading(false)
  }

  const handleAddTeam = async () => {
    if (!teamSlug) return
    setIsLoading(true)
    const result = await onAddTeamRepo(token, owner, teamSlug, owner, repo, permission)
    if (result.success) {
      setMessage(`✅ Team ${teamSlug} added to repository`)
      setTeamSlug('')
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-blue-500">🤝</span> GitHub Collaboration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">GitHub PAT</label>
            <input 
              type="password" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white"
              placeholder="ghp_..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Owner</label>
            <input 
              type="text" 
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white"
              placeholder="Username or Org"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Repository</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white"
                placeholder="repo-name"
              />
              <button 
                onClick={handleConnect}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              >
                {isLoading ? '...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-xs text-blue-400 mb-6">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Collaborator */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Add Collaborator</h4>
            <div className="p-4 bg-gray-950/30 rounded-xl border border-gray-800 space-y-4">
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="GitHub Username"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white"
                />
                <select 
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white outline-none"
                >
                  <option value="pull">Read (Pull)</option>
                  <option value="push">Write (Push)</option>
                  <option value="maintain">Maintain</option>
                  <option value="triage">Triage</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button 
                onClick={handleAddCollaborator}
                disabled={isLoading || !token}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-green-900/20"
              >
                Send Invitation
              </button>

              {isOrg && (
                <div className="pt-4 border-t border-gray-800 space-y-4">
                  <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">Organization Teams</h4>
                  <input 
                    type="text" 
                    value={teamSlug}
                    onChange={(e) => setTeamSlug(e.target.value)}
                    placeholder="Team Slug"
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-xs text-white"
                  />
                  <button 
                    onClick={handleAddTeam}
                    disabled={isLoading || !token}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Add Team to Repo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List Collaborators */}
          <div className="space-y-4">
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Current Collaborators ({collaborators.length})</h4>
            <div className="bg-gray-950/30 rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
              {collaborators.length === 0 ? (
                <p className="p-8 text-center text-xs text-gray-600 italic">No collaborators listed.</p>
              ) : (
                collaborators.map(c => (
                  <div key={c.login} className="p-3 flex justify-between items-center hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                        {c.login.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{c.login}</p>
                        <p className="text-[9px] text-gray-500 uppercase">{c.role_name || Object.keys(c.permissions).find(p => (c.permissions as any)[p])}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveCollaborator(c.login)}
                      className="text-gray-600 hover:text-red-400 p-1 transition-colors"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationView
