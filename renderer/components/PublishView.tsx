import React, { useState, useEffect } from 'react'
import { 
  Rocket, 
  ArrowUpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Ship, 
  Tag, 
  GitPullRequest,
  Info,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { cn } from "@/lib/utils"

interface PublishViewProps {
  currentPath: string
  onRefresh: () => void
}

const PublishView: React.FC<PublishViewProps> = ({ currentPath, onRefresh }) => {
  const [currentVersion, setCurrentVersion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [bumpType, setBumpType] = useState<'patch' | 'minor' | 'major'>('patch')

  useEffect(() => {
    loadVersion()
  }, [currentPath])

  const loadVersion = async () => {
    const version = await window.ipc.invoke('project:get-version')
    setCurrentVersion(version || '0.0.0')
  }

  const getNextVersion = (current: string, type: 'patch' | 'minor' | 'major') => {
    const parts = current.split('.').map(Number)
    if (parts.length !== 3) return '1.0.0'
    
    let [major, minor, patch] = parts
    if (type === 'major') {
      major++
      minor = 0
      patch = 0
    } else if (type === 'minor') {
      minor++
      patch = 0
    } else {
      patch++
    }
    return `${major}.${minor}.${patch}`
  }

  const handlePublish = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      const nextVersion = getNextVersion(currentVersion, bumpType)
      
      // 1. Update package.json
      const result = await window.ipc.invoke('project:set-version', nextVersion)
      if (!result.success) throw new Error(result.error)

      // 2. Git Tag
      await window.ipc.invoke('git:execute-command', `git add package.json`)
      await window.ipc.invoke('git:execute-command', `git commit -m "chore: bump version to ${nextVersion}"`)
      await window.ipc.invoke('git:execute-command', `git tag v${nextVersion}`)

      // 3. Push
      await window.ipc.invoke('git:execute-command', `git push origin main --tags`)
      
      setMessage(`Successfully published v${nextVersion}!`)
      setCurrentVersion(nextVersion)
      onRefresh()
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const nextVersion = getNextVersion(currentVersion, bumpType)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex items-center gap-6 mb-12">
        <div className="bg-purple-600/10 p-5 rounded-3xl border border-purple-500/20 shadow-2xl shadow-purple-900/10 scale-110">
          <Rocket className="size-10 text-purple-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Release Orchestrator</h2>
          <p className="text-gray-500 text-sm font-medium">Automate versioning, git tagging, and deployment pipelines.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card className="bg-gray-900/40 border-gray-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Ship className="size-32 text-purple-500" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Tag className="size-4 text-purple-400" /> Version Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center justify-between p-8 bg-gray-950/50 rounded-3xl border border-gray-800/50 relative">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Active State</p>
                  <p className="text-3xl font-mono font-black text-white">v{currentVersion}</p>
                </div>
                <div className="flex items-center px-4">
                  <ArrowRight className="size-6 text-gray-800" />
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest">Target State</p>
                  <p className="text-3xl font-mono font-black text-purple-400">v{nextVersion}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block pl-1">Semantic Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['patch', 'minor', 'major'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBumpType(type)}
                      className={cn(
                        "h-14 rounded-2xl border-2 text-sm font-black capitalize transition-all flex items-center justify-center gap-2",
                        bumpType === type
                          ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-lg shadow-purple-900/20 scale-105'
                          : 'bg-gray-900/50 border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                      )}
                    >
                      <ArrowUpCircle className={cn("size-4", bumpType === type ? "text-purple-400" : "text-gray-700")} />
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gray-950/30 border border-gray-800 p-8 rounded-3xl space-y-6">
            <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Deployment Manifest</h4>
            <div className="space-y-4">
              <ManifestItem icon={<CheckCircle className="size-4 text-green-500" />} text={`Update package.json manifest to v${nextVersion}`} />
              <ManifestItem icon={<CheckCircle className="size-4 text-green-500" />} text={`Generate immutable git tag v${nextVersion}`} />
              <ManifestItem icon={<CheckCircle className="size-4 text-green-500" />} text="Push snapshots and tags to origin/main" />
              <ManifestItem icon={<GitPullRequest className="size-4 text-blue-500" />} text="Trigger GitHub Actions deployment workflow" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-purple-600/5 border-purple-500/20 border-2 overflow-hidden shadow-2xl shadow-purple-950/20">
            <CardContent className="p-8 space-y-6">
              <div className="bg-purple-600/10 p-4 rounded-2xl border border-purple-500/30 w-fit">
                 <Ship className="size-8 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-white mb-2">Ready for Lift-off?</CardTitle>
                <CardDescription className="text-gray-500 font-medium">
                  This action will commit version changes directly to your primary branch and create a release tag.
                </CardDescription>
              </div>
              
              <div className="flex flex-col gap-4">
                {message && (
                  <div className={cn(
                    "p-4 rounded-xl text-xs font-bold font-mono tracking-tight animate-in slide-in-from-left-2 duration-300",
                    message.includes('❌') ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
                  )}>
                    {message}
                  </div>
                )}
                <Button
                  size="lg"
                  onClick={handlePublish}
                  disabled={isLoading || !currentVersion}
                  className={cn(
                    "w-full h-16 rounded-2xl font-black text-base transition-all gap-4 shadow-2xl",
                    isLoading || !currentVersion
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/40 hover:scale-[1.02] active:scale-95'
                  )}
                >
                  {isLoading ? 'Processing Release...' : 'Initiate Release'}
                  <Rocket className={cn("size-6", isLoading && "animate-bounce")} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="bg-amber-500/5 border border-amber-500/10 p-8 rounded-3xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <AlertTriangle className="size-16 text-amber-500" />
            </div>
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-3">
              <Info className="size-4" /> Strategic Note
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              If your CI/CD pipelines are not configured, you must manually upload build artifacts 
              (.exe, latest.yml) to the GitHub release page to ensure functional auto-updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ManifestItem = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-4 group">
    <div className="bg-gray-900 p-2 rounded-lg border border-gray-800 group-hover:border-blue-500/30 transition-colors">
      {icon}
    </div>
    <span className="text-[11px] text-gray-500 font-bold group-hover:text-gray-300 transition-colors">{text}</span>
  </div>
)

export default PublishView
