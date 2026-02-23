import { useState, useCallback } from 'react'

export const useGit = () => {
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [isRepo, setIsRepo] = useState(false)
  const [status, setStatus] = useState('')
  const [branch, setBranch] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentError, setCurrentError] = useState<any | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<{ ahead: number; behind: number; metadata: any | null }>({ ahead: 0, behind: 0, metadata: null })

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
        const [stat, br] = await Promise.all([
          window.ipc.invoke('git:status'),
          window.ipc.invoke('git:branch')
        ])
        setStatus(stat as string)
        setBranch(br as string)
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

  return {
    currentPath,
    isRepo,
    status,
    branch,
    logs,
    remotes,
    isLoading,
    currentError,
    setCurrentError,
    selectFolder,
    initRepo,
    commit,
    push,
    pull,
    addRemote,
    removeRemote,
    applyFix,
    runManualCommand,
    clearLogs,
    refreshRemotes,
    refreshStatus,
    remoteStatus,
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
    }
  }
}
