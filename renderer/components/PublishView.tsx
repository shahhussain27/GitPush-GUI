import React, { useState, useEffect } from 'react'
import {
  Rocket,
  CheckCircle,
  Circle,
  GitBranch,
  Globe,
  Save,
  Download,
  Upload,
  ArrowRight,
  Activity,
  Tag,
  ArrowUpCircle,
  ShieldCheck
} from 'lucide-react'
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

interface PublishViewProps {
  currentPath: string
  isRepo: boolean
  remotes: string
  status: string
  remoteStatus?: { ahead: number; behind: number; metadata: any | null }
  onInit: () => void
  onAddRemote: (name: string, url: string) => Promise<void>
  onCommit: (message: string) => void
  onPull: () => void
  onPush: () => void
  onRefresh: () => void
  onSetupAutoUpdate: () => Promise<{ success: boolean; status?: string; error?: string }>
  onCheckAutoUpdate: () => Promise<{ success: boolean; status?: string; error?: string }>
  onGetLatestRemoteTag: () => Promise<string | null>
  onGetCommitDelta: (tag: string) => Promise<number>
}

const PublishView: React.FC<PublishViewProps> = ({
  currentPath, isRepo, remotes, status, remoteStatus,
  onInit, onAddRemote, onCommit, onPull, onPush, onRefresh, onSetupAutoUpdate, onCheckAutoUpdate, onGetLatestRemoteTag, onGetCommitDelta
}) => {
  const [remoteUrl, setRemoteUrl] = useState('')
  const [commitMessage, setCommitMessage] = useState('First commit via Guided Publish')
  const [isSettingUpUpdate, setIsSettingUpUpdate] = useState(false)
  const [setupMessage, setSetupMessage] = useState('')

  const [currentVersion, setCurrentVersion] = useState('0.0.0')
  const [bumpType, setBumpType] = useState<'patch' | 'minor' | 'major'>('patch')
  const [isReleasing, setIsReleasing] = useState(false)
  const [releaseMsg, setReleaseMsg] = useState('')

  const hasOrigin = remotes.includes('origin')
  const hasUncommittedChanges = status && status.trim() !== ''
  const isBehind = (remoteStatus?.behind || 0) > 0
  const isAhead = (remoteStatus?.ahead || 0) > 0

  const [latestRemoteTag, setLatestRemoteTag] = useState<string | null>(null)
  const [commitDelta, setCommitDelta] = useState<number | null>(null)

  useEffect(() => {
    if (hasOrigin) {
      const originLine = remotes.split('\\n').find(line => line.startsWith('origin'))
      if (originLine) {
        const url = originLine.split(/\\s+/)[1]
        if (url && !remoteUrl) setRemoteUrl(url)
      }
    }
  }, [hasOrigin, remotes])

  useEffect(() => {
    const checkWorkflow = async () => {
      const res = await onCheckAutoUpdate()
      if (res.success) {
        if (res.status === 'configured') setSetupMessage('✅ Auto Update Configured')
        else if (res.status === 'update-required') setSetupMessage('⚠️ Workflow Update Required')
      }
    }
    const loadVersion = async () => {
      const v = await window.ipc.invoke('project:get-version')
      setCurrentVersion(v || '0.0.0')
      if (hasOrigin) {
        const tag = await onGetLatestRemoteTag()
        setLatestRemoteTag(tag)
        if (tag) {
          const delta = await onGetCommitDelta(tag)
          setCommitDelta(delta)
        }
      }
    }
    if (isRepo) {
      loadVersion()
      checkWorkflow()
    }
  }, [isRepo, currentPath, hasOrigin])

  const getNextVersion = (current: string, type: 'patch' | 'minor' | 'major') => {
    const parts = current.split('.').map(Number)
    if (parts.length !== 3) return '1.0.0'
    let [major, minor, patch] = parts
    if (type === 'major') { major++; minor = 0; patch = 0 }
    else if (type === 'minor') { minor++; patch = 0 }
    else { patch++ }
    return `${major}.${minor}.${patch}`
  }

  const nextVersion = getNextVersion(currentVersion, bumpType)

  const compareSemver = (v1: string, v2: string) => {
    const p1 = v1.replace('v', '').split('.').map(Number)
    const p2 = v2.replace('v', '').split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if (p1[i] > p2[i]) return 1;
      if (p1[i] < p2[i]) return -1;
    }
    return 0;
  }

  const isAlreadyPublished = latestRemoteTag && compareSemver(`v\${nextVersion}`, latestRemoteTag) <= 0
  const hasNoNewCommits = latestRemoteTag !== null && commitDelta === 0
  const isPublishDisabled = isReleasing || !hasOrigin || hasUncommittedChanges || isBehind || isAhead || Boolean(isAlreadyPublished) || hasNoNewCommits

  const handleRelease = async () => {
    setIsReleasing(true)
    setReleaseMsg('')
    try {
      const nextV = getNextVersion(currentVersion, bumpType)

      const vRes = await window.ipc.invoke('project:set-version', nextV)
      if (!vRes.success) throw new Error(vRes.error || 'Failed to update package.json')

      await window.ipc.invoke('git:execute-command', `git add package.json`)
      await window.ipc.invoke('git:execute-command', `git commit -m "chore: release v${nextV}"`)
      await window.ipc.invoke('git:execute-command', `git tag v${nextV}`)
      await window.ipc.invoke('git:execute-command', `git push origin --tags`)

      const currentBranch = await window.ipc.invoke('git:branch')
      await window.ipc.invoke('git:push', 'origin', currentBranch)

      onRefresh()
      setCurrentVersion(nextV)
      setReleaseMsg(`✅ Successfully released v${nextV} to remote!`)
    } catch (e: any) {
      setReleaseMsg(`❌ Release failed: ${e.message}`)
    } finally {
      setIsReleasing(false)
    }
  }


  const steps = [
    {
      id: 1,
      title: 'Initialize Git',
      description: 'Create a local Git repository to start tracking changes.',
      icon: <GitBranch className="size-6" />,
      isComplete: isRepo,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Your project needs a local Git repository before it can be published.</p>
          {!isRepo ? (
            <Button onClick={onInit} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-xl">
              Initialize Repository
            </Button>
          ) : (
            <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle className="size-5" /> Local repository is initialized.</div>
          )}
        </div>
      )
    },
    {
      id: 2,
      title: 'Add Remote',
      description: 'Connect your local repository to a remote server (e.g. GitHub).',
      icon: <Globe className="size-6" />,
      isComplete: hasOrigin,
      isDisabled: !isRepo,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Add a remote origin so Git knows where to push your code.</p>
          {!hasOrigin ? (
            <div className="space-y-3">
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl p-3 text-sm text-white font-mono"
              />
              <Button onClick={() => onAddRemote('origin', remoteUrl)} disabled={!remoteUrl} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-xl">
                Add Remote Origin
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle className="size-5" /> Remote origin is configured.</div>
              <input
                type="text"
                value={remoteUrl}
                readOnly
                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl p-3 text-sm text-gray-400 font-mono opacity-60 cursor-not-allowed"
              />
            </div>
          )}
        </div>
      )
    },
    {
      id: 3,
      title: 'Commit Changes',
      description: 'Save your current file modifications to the Git history.',
      icon: <Save className="size-6" />,
      isComplete: isRepo && !hasUncommittedChanges,
      isDisabled: !isRepo,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">You have uncommitted changes. Please commit them before publishing.</p>
          {hasUncommittedChanges ? (
            <div className="space-y-3">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full bg-gray-950/50 border border-gray-800 rounded-xl p-3 text-sm text-white font-mono"
              />
              <Button onClick={() => onCommit(commitMessage)} disabled={!commitMessage} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-xl">
                Commit All Changes
              </Button>
            </div>
          ) : (
            <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle className="size-5" /> Working directory is clean.</div>
          )}
        </div>
      )
    },
    {
      id: 4,
      title: 'Pull Latest',
      description: 'Fetch and merge any external changes from the remote server.',
      icon: <Download className="size-6" />,
      isComplete: hasOrigin && !isBehind,
      isDisabled: !hasOrigin,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Ensure your local code is up-to-date with the remote branch to avoid conflicts.</p>
          {isBehind ? (
            <Button onClick={onPull} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-xl">
              Pull Remote Changes (Rebase)
            </Button>
          ) : (
            <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle className="size-5" /> Local is up to date with remote.</div>
          )}
        </div>
      )
    },
    {
      id: 5,
      title: 'Push to Remote',
      description: 'Upload your committed changes to the connected remote repository.',
      icon: <Upload className="size-6" />,
      isComplete: hasOrigin && !hasUncommittedChanges && !isBehind && !isAhead,
      isDisabled: !hasOrigin || hasUncommittedChanges || isBehind,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Send your snapshots securely to the cloud storage (remote).</p>
          {isAhead ? (
            <Button onClick={onPush} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 rounded-xl">
              Push Commits
            </Button>
          ) : (
            <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle className="size-5" /> Changes synced with remote.</div>
          )}
        </div>
      )
    },
    {
      id: 6,
      title: 'Configure Auto Update Pipeline',
      description: 'Ensure a GitHub Actions workflow exists to build and release your app on version tags.',
      icon: <ShieldCheck className="size-6" />,
      isComplete: setupMessage.includes('✅') && !setupMessage.includes('commit'), // Don't block flow, but indicate visually.
      isDisabled: !hasOrigin,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Automatically generate or verify the workflow that builds the application on the cloud when creating a release.</p>
          <div className="flex flex-col gap-3 max-w-sm">
            <Button
              onClick={async () => {
                setIsSettingUpUpdate(true)
                setSetupMessage('')
                const res = await onSetupAutoUpdate()
                setIsSettingUpUpdate(false)
                if (res.success) {
                  if (res.status === 'exists') {
                    setSetupMessage('✅ Workflow already exists and is up-to-date. No changes needed.')
                  } else {
                    setSetupMessage(`✅ Workflow ${res.status}! Please return to Step 3 to commit the new workflow changes.`)
                  }
                } else {
                  setSetupMessage('❌ Failed to generate configuration: ' + res.error)
                }
              }}
              disabled={isSettingUpUpdate || !hasOrigin}
              className="bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 font-bold h-12 px-6 rounded-xl transition-all"
            >
              {isSettingUpUpdate ? "Verifying..." : "Verify / Create Pipeline"}
            </Button>
            {setupMessage && <p className="text-xs font-mono text-gray-400">{setupMessage}</p>}
          </div>
        </div >
      )
    },
    {
      id: 7,
      title: 'Create Release Tag',
      description: 'Bump the semantic version, create a Git tag, and trigger the remote deployment.',
      icon: <Tag className="size-6" />,
      isComplete: false,
      isDisabled: !hasOrigin || hasUncommittedChanges || isBehind || isAhead,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm">You are ready to release! Choose the semantic bump to trigger the pipeline.</p>

          {hasNoNewCommits && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="size-5 text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-400">No new commits detected</p>
                <p className="text-xs text-orange-400/80 mt-1">There are no new commits since <strong>{latestRemoteTag}</strong>. Please make new commits before publishing a new release.</p>
              </div>
            </div>
          )}

          <div className={cn("flex items-center gap-6 p-4 rounded-2xl border relative overflow-hidden", hasNoNewCommits ? "bg-gray-900 border-gray-800 opacity-50" : "bg-gray-950/50 border-gray-800")}>
            {latestRemoteTag && (
              <div className="absolute top-0 right-0 bg-blue-500/20 px-3 py-1 rounded-bl-lg text-[10px] text-blue-400 font-bold border-b border-l border-blue-500/30">
                Latest Remote Tag: {latestRemoteTag}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-black uppercase">Current Version</p>
              <p className="text-xl font-mono font-black text-gray-300">v{currentVersion}</p>
            </div>
            <ArrowRight className="size-5 text-gray-700" />
            <div className="space-y-1">
              <p className="text-[10px] text-blue-500 font-black uppercase">Next Release</p>
              <p className={cn("text-xl font-mono font-black", isAlreadyPublished ? "text-red-400 line-through" : "text-blue-400")}>v{nextVersion}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['patch', 'minor', 'major'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setBumpType(type)}
                disabled={hasNoNewCommits}
                className={cn(
                  "h-12 rounded-xl border-2 text-sm font-black capitalize transition-all flex items-center justify-center gap-2",
                  hasNoNewCommits ? "bg-gray-950 border-gray-900 text-gray-700 cursor-not-allowed" :
                    bumpType === type
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                )}
              >
                <ArrowUpCircle className={cn("size-4", bumpType === type && !hasNoNewCommits ? "text-blue-400" : "text-gray-700")} />
                {type}
              </button>
            ))}
          </div>

          <Button
            onClick={handleRelease}
            disabled={isPublishDisabled}
            className={cn(
              "w-full font-bold h-14 rounded-xl shadow-lg text-base",
              isAlreadyPublished || hasNoNewCommits
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
            )}
          >
            {isReleasing ? "Releasing..." : isAlreadyPublished ? "Latest Version Already Published" : hasNoNewCommits ? "No Commits to Release" : `Publish Release v\${nextVersion}`}
          </Button>

          {releaseMsg && (
            <p className={cn("text-xs font-mono p-3 rounded-lg border", releaseMsg.includes('❌') ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20")}>
              {releaseMsg}
            </p>
          )}
        </div>
      )
    }
  ]

  let activeStep = 1;
  for (const step of steps) {
    if (!step.isComplete && step.id !== 6) { // Step 6 is optional/parallel to flow
      activeStep = step.id;
      break;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex items-center gap-6 mb-8">
        <div className="bg-purple-600/10 p-5 rounded-3xl border border-purple-500/20 shadow-2xl shadow-purple-900/10 scale-110">
          <Rocket className="size-10 text-purple-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Guided Publish Helper</h2>
          <p className="text-gray-500 text-sm font-medium">Follow this step-by-step wizard to safely version and publish your code.</p>
        </div>
      </div>

      <div className="space-y-6 pb-20">
        {steps.map((step) => {
          const isActive = step.id === activeStep || (step.id === 6 && activeStep === 7) // Keep Setup active at end
          const isPast = step.id < activeStep || step.isComplete

          return (
            <div
              key={step.id}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-500 flex gap-6",
                isActive ? "bg-gray-900 border-blue-500/50 shadow-2xl shadow-blue-900/20" :
                  isPast ? "bg-gray-950 border-green-500/20 opacity-80" :
                    "bg-gray-950 border-gray-800/50 opacity-40 grayscale"
              )}
            >
              <div className="shrink-0 pt-1">
                {isPast ? (
                  <CheckCircle className="size-8 text-green-500" />
                ) : isActive ? (
                  <Activity className="size-8 text-blue-500 animate-pulse" />
                ) : (
                  <Circle className="size-8 text-gray-700" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className={cn("text-xl font-bold", isActive ? "text-white" : "text-gray-300")}>{step.title}</h3>
                  {isActive && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-500/30">Action Required</span>}
                </div>
                <p className="text-sm font-medium text-gray-500">{step.description}</p>

                {/* Reveal content if active or past but not fully completed technically */}
                <div className={cn("pt-4 transition-all overflow-hidden", isActive ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
                  {step.content}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PublishView
