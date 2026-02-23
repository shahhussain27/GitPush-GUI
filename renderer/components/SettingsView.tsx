import React, { useEffect, useState } from 'react'
import { 
  Settings, 
  User, 
  Mail, 
  ShieldCheck, 
  Save, 
  Github, 
  Info,
  Terminal,
  Cpu
} from 'lucide-react'
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

const SettingsView: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [version, setVersion] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [n, e, v] = await Promise.all([
          window.ipc.invoke('git:config-get', 'user.name'),
          window.ipc.invoke('git:config-get', 'user.email'),
          window.ipc.invoke('app:get-version')
        ])
        setName(n as string)
        setEmail(e as string)
        setVersion(v as string)
      } catch (err) {
        console.error('Failed to load config:', err)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')
    try {
      await Promise.all([
        window.ipc.invoke('git:config-set', 'user.name', name),
        window.ipc.invoke('git:config-set', 'user.email', email)
      ])
      setMessage('✅ Settings synchronized globally!')
    } catch (err) {
      setMessage('❌ Failed to update global state.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      <div className="flex items-center gap-6 mb-12">
        <div className="bg-blue-600/10 p-5 rounded-3xl border border-blue-500/20 shadow-2xl shadow-blue-900/10 scale-110">
          <Settings className="size-10 text-blue-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control Center</h2>
          <p className="text-gray-500 text-sm font-medium">Configure global identity and system preferences.</p>
        </div>
      </div>

      <Card className="bg-gray-900/40 border-gray-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Terminal className="size-32 text-blue-500" />
        </div>
        <CardHeader>
          <div className="flex items-center gap-3">
             <User className="size-5 text-blue-500" />
             <CardTitle className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5">Global Identity</CardTitle>
          </div>
          <CardDescription className="text-gray-600 mt-2">These credentials will be attached to every commit you manifest.</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest pl-1">Author Alias</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Satoshi Nakamoto"
                    className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-gray-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest pl-1">Communication Node</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. s.nakamoto@p2p.foundation"
                    className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-gray-800 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl flex items-start gap-4">
               <ShieldCheck className="size-5 text-blue-500 shrink-0 mt-0.5" />
               <div className="space-y-1">
                 <p className="text-xs font-black text-blue-500/70 uppercase tracking-widest">Global Synchronization</p>
                 <p className="text-xs text-gray-500 leading-relaxed font-medium">
                   This action executes `git config --global`. These settings persist across all local repositories unless explicitly overridden in specific project contexts.
                 </p>
               </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-800/50">
              <div className="flex items-center gap-2">
                {message && (
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-left-2 transition-all",
                    message.includes('✅') ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  )}>
                    {message}
                  </div>
                )}
              </div>
              <Button 
                type="submit"
                disabled={isSaving}
                className={cn(
                  "h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all gap-3 shadow-2xl",
                  isSaving 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 hover:scale-[1.02] active:scale-95'
                )}
              >
                {isSaving ? 'Syncing...' : 'Commit Changes'}
                <Save className={cn("size-4", isSaving && "animate-pulse")} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-center pt-16 border-t border-gray-800/50 gap-4 opacity-30 hover:opacity-100 transition-all duration-700 grayscale hover:grayscale-0">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center transform rotate-12 group-hover:rotate-0 transition-transform">
             <Github className="size-5 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white tracking-[0.3em] uppercase italic">GitPush GUI Alpha</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-mono font-black border-gray-800 text-gray-500 bg-gray-950/50">v{version}</Badge>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="size-3" /> Core Engine v1.0.4
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
           <Separator className="w-12 bg-gray-800" />
           <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">Nextron Terminal</p>
           <Separator className="w-12 bg-gray-800" />
        </div>
      </div>
    </div>
  )
}

export default SettingsView
