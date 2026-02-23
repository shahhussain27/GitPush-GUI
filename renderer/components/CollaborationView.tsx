import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Key, 
  User, 
  Github, 
  Link, 
  Shield, 
  UserPlus, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Building,
  ArrowRight,
  Info
} from 'lucide-react'
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

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
      setMessage('⚠️ Please provide PAT, Owner, and Repo name.')
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
          setMessage('✅ Connected to GitHub repository')
        } else {
          setMessage(`❌ Error: ${collabs.error}`)
        }
      } else {
        setMessage(`❌ Error: ${details.error}`)
      }
    } catch (e: any) {
      setMessage(`❌ Connection failed: ${e.message}`)
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="bg-gray-900/40 border-gray-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Users className="size-32 text-blue-500" />
         </div>
         <CardHeader>
           <div className="flex items-center gap-4 mb-2">
             <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20 shadow-xl">
               <Users className="size-6 text-blue-500" />
             </div>
             <div>
               <CardTitle className="text-2xl font-black text-white tracking-tighter">Team Sovereignty</CardTitle>
               <CardDescription className="text-gray-500 font-medium">Manage access and collaboration via GitHub API</CardDescription>
             </div>
           </div>
         </CardHeader>
         
         <CardContent className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-3">
               <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block pl-1">Personal Access Token</label>
               <div className="relative group">
                 <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                   type="password" 
                   value={token}
                   onChange={(e) => setToken(e.target.value)}
                   className="w-full bg-gray-950/50 border border-gray-800/50 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-gray-800 font-mono"
                   placeholder="ghp_************************"
                 />
               </div>
             </div>
             <div className="space-y-3">
               <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block pl-1">Repository Owner</label>
               <div className="relative group">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                   type="text" 
                   value={owner}
                   onChange={(e) => setOwner(e.target.value)}
                   className="w-full bg-gray-950/50 border border-gray-800/50 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-bold placeholder:text-gray-800"
                   placeholder="username"
                 />
               </div>
             </div>
             <div className="space-y-3">
               <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block pl-1">Repository Logic</label>
               <div className="flex gap-3">
                 <div className="relative group flex-1">
                   <Github className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                   <input 
                     type="text" 
                     value={repo}
                     onChange={(e) => setRepo(e.target.value)}
                     className="w-full bg-gray-950/50 border border-gray-800/50 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-bold placeholder:text-gray-800"
                     placeholder="project-repo"
                   />
                 </div>
                 <Button 
                   onClick={handleConnect}
                   disabled={isLoading}
                   className="rounded-2xl bg-blue-600 hover:bg-blue-500 h-11 px-6 font-black text-xs uppercase tracking-widest gap-2"
                 >
                   <Link className={cn("size-3", isLoading && "animate-spin")} />
                   Connect
                 </Button>
               </div>
             </div>
           </div>

           {message && (
             <div className={cn(
               "p-4 rounded-2xl text-[11px] font-bold font-mono tracking-tight animate-in slide-in-from-left-2 duration-300",
               message.includes('❌') ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
             )}>
               {message}
             </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             {/* Add Collaborator */}
             <div className="space-y-6">
               <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] pl-1">Access Provisioning</h4>
               <div className="p-8 bg-gray-950/40 rounded-3xl border border-gray-800/50 space-y-6">
                 <div className="space-y-4">
                   <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest block">GitHub Identity</label>
                   <input 
                     type="text" 
                     value={newUsername}
                     onChange={(e) => setNewUsername(e.target.value)}
                     placeholder="Search GitHub users..."
                     className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-gray-800 font-bold"
                   />
                   <div className="space-y-2">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest block">Permissions Level</label>
                     <select 
                       value={permission}
                       onChange={(e) => setPermission(e.target.value)}
                       className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-black uppercase tracking-tighter cursor-pointer"
                     >
                       <option value="pull">Read (Pull Only)</option>
                       <option value="push">Write (Push & Pull)</option>
                       <option value="maintain">Maintain (Workflow Admin)</option>
                       <option value="triage">Triage (Issue Monitor)</option>
                       <option value="admin">Full Admin Authority</option>
                     </select>
                   </div>
                 </div>
                 <Button 
                   onClick={handleAddCollaborator}
                   disabled={isLoading || !token}
                   className="w-full h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black gap-3 shadow-xl shadow-green-900/20 text-xs uppercase tracking-widest"
                 >
                   <UserPlus className="size-4" />
                   Invite Collaborator
                 </Button>

                 {isOrg && (
                   <div className="pt-8 mt-4 border-t border-gray-800/50 space-y-6">
                     <div className="flex items-center gap-2">
                       <Building className="size-3 text-blue-500" />
                       <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Team Integration</h4>
                     </div>
                     <input 
                       type="text" 
                       value={teamSlug}
                       onChange={(e) => setTeamSlug(e.target.value)}
                       placeholder="Enter Team Slug (e.g. engineering-leads)"
                       className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white outline-none transition-all placeholder:text-gray-800 font-bold"
                     />
                     <Button 
                       onClick={handleAddTeam}
                       disabled={isLoading || !token}
                       className="w-full h-14 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-2xl font-black gap-3 text-xs uppercase tracking-widest transition-all"
                     >
                       <Users className="size-4" />
                       Link Organization Team
                     </Button>
                   </div>
                 )}
               </div>
             </div>

             {/* List Collaborators */}
             <div className="space-y-6">
               <div className="flex items-center justify-between pl-1">
                 <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Active Consortium</h4>
                 <Badge variant="outline" className="text-[10px] font-black border-blue-500/20 text-blue-400 opacity-60 tabular-nums">{collaborators.length}</Badge>
               </div>
               <div className="bg-gray-950/40 rounded-3xl border border-gray-800/50 overflow-hidden h-[450px] flex flex-col shadow-inner">
                 {collaborators.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4 opacity-30 grayscale">
                      <div className="bg-gray-800/50 p-6 rounded-full">
                        <Users className="size-12 text-gray-600" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.2em]">No collaborators found</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-gray-800/30 overflow-y-auto custom-scrollbar">
                     {collaborators.map(c => (
                       <div key={c.login} className="p-5 flex justify-between items-center hover:bg-blue-500/[0.02] transition-colors group">
                         <div className="flex items-center gap-4">
                           <div className="relative">
                             <div className="size-10 rounded-2xl bg-gray-800 flex items-center justify-center text-xs font-black text-gray-500 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all transform group-hover:scale-105 border border-gray-800 group-hover:border-blue-500/20">
                               {c.login.charAt(0).toUpperCase()}
                             </div>
                             <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 border-2 border-gray-950 rounded-full"></div>
                           </div>
                           <div>
                             <p className="text-sm font-black text-gray-200 group-hover:text-white transition-colors">{c.login}</p>
                             <div className="flex items-center gap-1.5 mt-0.5">
                               <Shield className="size-2.5 text-gray-600" />
                               <p className="text-[9px] text-gray-600 font-black uppercase tracking-tighter group-hover:text-blue-500/70 transition-colors">
                                 {c.role_name || Object.keys(c.permissions).find(p => (c.permissions as any)[p])}
                               </p>
                             </div>
                           </div>
                         </div>
                         <Button 
                           variant="ghost"
                           size="icon"
                           onClick={() => handleRemoveCollaborator(c.login)}
                           className="size-9 rounded-xl hover:bg-red-500/10 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                           title="Revoke Access"
                         >
                           <Trash2 className="size-4" />
                         </Button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               
               <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex items-start gap-3">
                 <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                   Collaborators will receive an email invitation. They must accept the invite on GitHub before they appear as active members.
                 </p>
               </div>
             </div>
           </div>
         </CardContent>
      </Card>
    </div>
  )
}

export default CollaborationView
