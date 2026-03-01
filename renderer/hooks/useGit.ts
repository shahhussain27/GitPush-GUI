import { useState, useCallback, useEffect } from 'react'

export const useGit = () => {
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [isRepo, setIsRepo] = useState(false)
  const [status, setStatus] = useState('')
  const [branch, setBranch] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentError, setCurrentError] = useState<any | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<{ ahead: number; behind: number; metadata: any | null }>({ ahead: 0, behind: 0, metadata: null })
  const [conflictedFiles, setConflictedFiles] = useState<string[]>([])

  // Persistent GitHub PAT
  const [githubPat, setGithubPatState] = useState<string>('')

  // Load PAT on hook initialization
  useEffect(() => {
    window.ipc.invoke('store:get-pat').then((pat) => {
      if (pat) setGithubPatState(pat as string)
    }).catch(console.error)
  }, [])

  const setGithubPat = async (token: string) => {
    await window.ipc.invoke('store:set-pat', token)
    setGithubPatState(token)
  }

  const deleteGithubPat = async () => {
    await window.ipc.invoke('store:delete-pat')
    setGithubPatState('')
  }

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  const checkRemoteUpdates = useCallback(async () => {
    if (!currentPath || !isRepo) return;
    try {
      const result = await window.ipc.invoke('git:check-updates');
      if (result.success) {
        setRemoteStatus({
          ahead: result.ahead,
          behind: result.behind,
          metadata: result.metadata
        });
      }
    } catch (e: any) {
      console.error('Update check failed:', e);
      addLog(`Error checking for updates: ${e.message}`)
    }
  }, [currentPath, isRepo]);

  const refreshStatus = useCallback(async () => {
    if (!currentPath) return
    try {
      const repoStatus = await window.ipc.invoke('git:is-repo')
      setIsRepo(repoStatus)
      if (repoStatus) {
        const [stat, br, conflicts] = await Promise.all([
          window.ipc.invoke('git:status'),
          window.ipc.invoke('git:branch'),
          window.ipc.invoke('git:conflicts')
        ])
        setStatus(stat as string)
        setBranch(br as string)
        setConflictedFiles(conflicts as string[])
      }
    } catch (e: any) {
      addLog(`Error: ${e.message}`)
    }
  }, [currentPath])

  const selectFolder = async () => {
    try {
      const path = await window.ipc.invoke('select-folder')
      if (path) {
        setCurrentPath(path as string)
        addLog(`Selected folder: ${path}`)
        // We trigger refreshStatus via useEffect in the component
      }
    } catch (e: any) {
      addLog(`Error selecting folder: ${e.message}`)
    }
  }

  const initRepo = async () => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      const result = await window.ipc.invoke('git:init')
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error: ${result.error.message}`)
      } else {
        addLog('Initialized repository')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error initializing: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const gitClone = async (url: string, targetDirectory: string) => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog(`Cloning repository ${url} into ${targetDirectory}...`)
      const result = await window.ipc.invoke('git:clone', url, targetDirectory)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error cloning: ${result.error.message}`)
        return false
      } else {
        addLog('Repository cloned successfully')
        // Automatically set the new path and refresh
        setCurrentPath(targetDirectory)
        return true
      }
    } catch (e: any) {
      addLog(`Error cloning: ${e.message}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const commit = async (message: string) => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog('Staging files...')
      await window.ipc.invoke('git:add', '.')
      addLog(`Committing: ${message.slice(0, 20)}...`)
      const result = await window.ipc.invoke('git:commit', message)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error: ${result.error.message}`)
      } else {
        addLog('Commit successful')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error committing: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const [remotes, setRemotes] = useState('')

  const refreshRemotes = useCallback(async () => {
    if (!currentPath) return
    try {
      const r = await window.ipc.invoke('git:remotes')
      setRemotes(r as string)
    } catch (e: any) {
      addLog(`Error fetching remotes: ${e.message}`)
    }
  }, [currentPath])

  const addRemote = async (name: string, url: string) => {
    try {
      addLog(`Adding remote ${name}: ${url}`)
      await window.ipc.invoke('git:add-remote', name, url)
      addLog('Remote added successfully')
      await refreshRemotes()
    } catch (e: any) {
      addLog(`Error adding remote: ${e.message}`)
    }
  }

  const removeRemote = async (name: string) => {
    try {
      addLog(`Removing remote: ${name}`)
      await window.ipc.invoke('git:remote-remove', name)
      addLog('Remote removed successfully')
      await refreshRemotes()
    } catch (e: any) {
      addLog(`Error removing remote: ${e.message}`)
    }
  }

  const push = async () => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog('Pushing to remote...')
      const targetBranch = branch || 'master'
      const result = await window.ipc.invoke('git:push', 'origin', targetBranch)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error: ${result.error.message}`)
      } else {
        addLog('Push successful')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error pushing: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const pull = async () => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog('Pulling from remote...')
      const targetBranch = branch || 'master'
      const result = await window.ipc.invoke('git:pull', 'origin', targetBranch)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error: ${result.error.message}`)
      } else {
        addLog('Pull successful')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error pulling: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFix = async (command: string) => {
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog(`Applying fix: ${command}`)
      const result = await window.ipc.invoke('git:execute-command', command)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Fix failed: ${result.error.message}`)
      } else {
        addLog('Fix applied successfully')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error applying fix: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const runManualCommand = async (command: string) => {
    if (!command.trim()) return
    setIsLoading(true)
    setCurrentError(null)
    try {
      addLog(`$ ${command}`)
      const result = await window.ipc.invoke('git:execute-command', command)
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error: ${result.error.message}`)
      } else {
        addLog('Command executed successfully')
        if (result.stdout) addLog(result.stdout)
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Execution error: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const abortRebase = async () => {
    setIsLoading(true)
    try {
      addLog('Aborting rebase/merge operation...')
      await window.ipc.invoke('git:abort-rebase')
      addLog('Operation aborted successfully.')
      await refreshStatus()
    } catch (e: any) {
      addLog(`Error aborting: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const continueRebase = async () => {
    setIsLoading(true)
    try {
      addLog('Continuing rebase/merge operation...')
      const result = await window.ipc.invoke('git:continue-rebase')
      if (result.error) {
        setCurrentError(result.error)
        addLog(`Error continuing: ${result.error.message}`)
      } else {
        addLog('Operation continued successfully.')
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error continuing: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resolveConflict = async (file: string, strategy: 'ours' | 'theirs') => {
    setIsLoading(true)
    try {
      addLog(`Resolving conflict in ${file} using '${strategy}'...`)
      const result = await window.ipc.invoke('git:resolve-conflict', file, strategy)
      if (result.error) {
        addLog(`Error resolving conflict: ${result.error.message}`)
      } else {
        addLog(`Conflict in ${file} resolved successfully!`)
        await refreshStatus()
      }
    } catch (e: any) {
      addLog(`Error resolving conflict: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    currentPath,
    isRepo,
    status,
    branch,
    logs,
    remotes,
    isLoading,
    currentError,
    conflictedFiles,
    setCurrentError,
    selectFolder,
    initRepo,
    gitClone,
    commit,
    push,
    pull,
    addRemote,
    removeRemote,
    applyFix,
    runManualCommand,
    clearLogs,
    abortRebase,
    continueRebase,
    resolveConflict,
    refreshRemotes,
    refreshStatus,
    remoteStatus,
    githubPat,
    setGithubPat,
    deleteGithubPat,
    checkRemoteUpdates,
    getRepoDetails: async (token: string, owner: string, repo: string) => {
      return await window.ipc.invoke('github:get-repo-details', { token, owner, repo });
    },
    listCollaborators: async (token: string, owner: string, repo: string) => {
      const result = await window.ipc.invoke('github:list-collaborators', { token, owner, repo });
      return result;
    },
    addCollaborator: async (token: string, owner: string, repo: string, username: string, permission: string) => {
      return await window.ipc.invoke('github:add-collaborator', { token, owner, repo, username, permission });
    },
    removeCollaborator: async (token: string, owner: string, repo: string, username: string) => {
      return await window.ipc.invoke('github:remove-collaborator', { token, owner, repo, username });
    },
    addTeamRepo: async (token: string, org: string, team: string, owner: string, repo: string, permission: string) => {
      return await window.ipc.invoke('github:add-team-repo', { token, org, team, owner, repo, permission });
    },
    createGitHubRepo: async (token: string, name: string, isPrivate: boolean) => {
      setIsLoading(true)
      try {
        addLog(`Creating GitHub repository: ${name}...`)
        const result = await window.ipc.invoke('github:create-repo', { token, name, isPrivate })
        if (result.success) {
          addLog(`✅ Repository created and pushed successfully!`)
          addLog(`URL: ${result.repoInfo.clone_url}`)
          await refreshStatus()
          return { success: true }
        } else {
          addLog(`❌ Failed: ${result.error}`)
          return { success: false, error: result.error }
        }
      } catch (e: any) {
        addLog(`Unexpected error: ${e.message}`)
        return { success: false, error: e.message }
      } finally {
        setIsLoading(false)
      }
    },
    setupAutoUpdate: async (): Promise<{ success: boolean; status?: string; error?: string }> => {
      setIsLoading(true)
      try {
        addLog(`Checking GitHub Actions Workflow for Auto Updates...`)
        const result = await window.ipc.invoke('project:setup-auto-update')
        if (result.success) {
          if (result.status === 'exists') {
            addLog(`✅ Auto Update configuration (.github/workflows/release.yml) is already up-to-date!`)
          } else {
            addLog(`✅ Auto Update configuration (.github/workflows/release.yml) ${result.status}!`)
            addLog(`Please commit and push the new files to trigger the pipeline on your next release.`)
          }
          await refreshStatus()
          return { success: true, status: result.status }
        } else {
          addLog(`❌ Failed to generate configuration: ${result.error}`)
          return { success: false, error: result.error }
        }
      } catch (e: any) {
        addLog(`Unexpected error: ${e.message}`)
        return { success: false, error: e.message }
      } finally {
        setIsLoading(false)
      }
    },
    checkAutoUpdate: async (): Promise<{ success: boolean; status?: string; error?: string }> => {
      try {
        return await window.ipc.invoke('project:check-auto-update')
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    },
    getLatestRemoteTag: async (): Promise<string | null> => {
      try {
        const res = await window.ipc.invoke('project:get-latest-tag')
        return res.success ? res.tag : null
      } catch (e: any) {
        return null
      }
    },
    getCommitDelta: async (tag: string): Promise<number> => {
      try {
        const res = await window.ipc.invoke('project:get-commit-delta', tag)
        return res.success ? res.delta : 0
      } catch (e: any) {
        return 0
      }
    }
  }
}
