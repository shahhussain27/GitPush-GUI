import React, { useState, useEffect } from 'react'

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
            <span className="text-2xl">🚀</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Publish Application</h2>
            <p className="text-gray-400 text-sm">Automate versioning, tagging, and pushing releases.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-800">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Current Version</p>
              <p className="text-2xl font-mono font-bold text-white">v{currentVersion}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Target Version</p>
              <p className="text-2xl font-mono font-bold text-purple-400">v{getNextVersion(currentVersion, bumpType)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Release Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(['patch', 'minor', 'major'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setBumpType(type)}
                  className={`p-3 rounded-lg border text-sm font-bold capitalize transition-all ${
                    bumpType === type
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-950/50 border border-gray-800 p-4 rounded-lg space-y-2">
            <h4 className="text-[10px] text-gray-400 font-bold uppercase">Workflow Actions</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Update package.json to v{getNextVersion(currentVersion, bumpType)}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Create git tag v{getNextVersion(currentVersion, bumpType)}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Push to origin with --tags
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs font-medium text-purple-400">{message}</p>
            <button
              onClick={handlePublish}
              disabled={isLoading || !currentVersion}
              className={`px-8 py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
                isLoading || !currentVersion
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
              }`}
            >
              {isLoading ? 'Publishing...' : 'Publish Release'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <span>⚠️</span> Important: Release Artifacts
        </h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          The <strong>Publish</strong> button triggers your GitHub Action to build the app. 
          If you don't use GitHub Actions, you must manually upload the <strong>.exe</strong> and <strong>latest.yml</strong> files 
          from your local <code>dist</code> folder to the release page on GitHub for auto-updates to work.
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl italic">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Note:</strong> This will commit the version change directly to your `main` branch. Ensure your working tree is clean before publishing.
        </p>
      </div>
    </div>
  )
}

export default PublishView
