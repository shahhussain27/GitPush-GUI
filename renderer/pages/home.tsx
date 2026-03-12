import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import RepositoryView from '../components/RepositoryView'
import HistoryView from '../components/HistoryView'
import SettingsView from '../components/SettingsView'
import PublishView from '../components/PublishView'
import Image from 'next/image'
import { useGit } from '../hooks/useGit'
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { FolderOpen, Sparkles, Command, Rocket, LayoutDashboard, FileDown, GitBranch } from 'lucide-react'
import { cn } from '../lib/utils'
import GraphTab from '../components/GraphTab'
import ConflictsTab from '../components/ConflictsTab'
import HealthAnalyzerTab from '../components/HealthAnalyzerTab'

export default function HomePage() {
  const {
    currentPath,
    isRepo,
    status,
    branch,
    remotes,
    logs,
    isLoading,
    selectFolder,
    refreshStatus,
    initRepo,
    gitClone,
    commit,
    push,
    pull,
    runManualCommand,
    clearLogs,
    currentError,
    conflictedFiles,
    abortRebase,
    continueRebase,
    resolveConflict,
    applyFix,
    createGitHubRepo,
    removeRemote,
    remoteStatus,
    checkRemoteUpdates,
    getRepoDetails,
    listCollaborators,
    addCollaborator,
    removeCollaborator,
    addTeamRepo,
    addRemote,
    githubPat,
    setGithubPat,
    deleteGithubPat,
    setupAutoUpdate,
    checkAutoUpdate,
    getLatestRemoteTag,
    getCommitDelta,
    analyzeHealth,
    hasOrigin,
    getCommits
  } = useGit()

  const [activeSidebarTab, setActiveSidebarTab] = useState('Status')
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'graph'>('status')
  const [commits, setCommits] = useState<any[]>([])

  useEffect(() => {
    if (currentPath) {
      refreshStatus()
      checkRemoteUpdates()
      const statusInterval = setInterval(refreshStatus, 5000)
      const updateInterval = setInterval(checkRemoteUpdates, 30000)
      return () => {
        clearInterval(statusInterval)
        clearInterval(updateInterval)
      }
    }
  }, [currentPath, refreshStatus, checkRemoteUpdates])

  useEffect(() => {
    const fetchCommits = async () => {
      if (currentPath && isRepo && activeTab === 'graph') {
        const fetchedCommits = await getCommits()
        setCommits(fetchedCommits)
      }
    }
    fetchCommits()
  }, [currentPath, isRepo, activeTab, getCommits])

  const handleCommit = async (message: string, files: string[]) => {
    await commit(message, files)
    refreshStatus()
  }

  const handlePush = async () => {
    await push()
    refreshStatus()
  }

  const handlePull = async () => {
    await pull()
    refreshStatus()
  }

  const handleCreateRepo = async (path: string) => {
    await initRepo()
    refreshStatus()
  }

  const handleCloneRepo = async (url: string, path: string) => {
    await gitClone(url, path)
    refreshStatus()
  }

  const handleCreateGitHub = async (name: string, isPrivate: boolean): Promise<{ success: boolean; error?: string }> => {
    const res = await createGitHubRepo('', name, isPrivate)
    refreshStatus()
    return { success: res?.success || false, error: res?.error }
  }

  const renderContent = () => {
    if (!currentPath) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-gray-950 p-8 rounded-2xl border border-gray-800">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={120}
                height={120}
                className="mx-auto drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          <div className="max-w-xl space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Modern Git <span className="text-blue-500">Simplified</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              Experience a cleaner, more intuitive way to manage your repositories.
              Built for speed, styled for the future.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={selectFolder}
              className="px-8 py-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 gap-3"
            >
              <FolderOpen className="size-5" />
              Open Repository
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-300 rounded-xl gap-3"
            >
              <Command className="size-5 text-blue-500" />
              Quick Actions
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-12 text-left">
            <Card className="bg-gray-900/30 border-gray-800/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <Sparkles className="size-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-bold text-gray-200 mb-1">Visual Status</h3>
                <p className="text-xs text-gray-500">Track changes with a beautiful, clear diff interface.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/30 border-gray-800/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <Rocket className="size-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-bold text-gray-200 mb-1">Fast Push</h3>
                <p className="text-xs text-gray-500">Single-click workflows for pushing and pulling changes.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/30 border-gray-800/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <LayoutDashboard className="size-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-bold text-gray-200 mb-1">Total Control</h3>
                <p className="text-xs text-gray-500">Full control over your git history and remotes.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    switch (activeSidebarTab) {
      case 'Status':
      case 'Changes':
        return (
          <RepositoryView
            currentPath={currentPath}
            status={status}
            branch={branch}
            isRepo={isRepo}
            onInit={initRepo}
            onClone={gitClone}
            onCommit={(message) => handleCommit(message, [])}
            onPush={handlePush}
            onPull={handlePull}
            isLoading={isLoading}
            currentError={currentError}
            conflictedFiles={conflictedFiles}
            onResolveConflict={resolveConflict}
            onApplyFix={applyFix}
            remoteStatus={remoteStatus}
            onGitHubCreate={(token, name, isPrivate) => handleCreateGitHub(name, isPrivate)}
            onRemoveRemote={removeRemote}
            onListCollaborators={listCollaborators}
            onAddCollaborator={addCollaborator}
            onRemoveCollaborator={removeCollaborator}
            githubPat={null}
            setGithubPat={setGithubPat}
            deleteGithubPat={deleteGithubPat}
            onRefresh={refreshStatus}
            hasOrigin={hasOrigin || false}
          />
        )
      case 'History':
        return (
          <GraphTab
            currentPath={currentPath}
            isRepo={isRepo}
            onRefreshBranch={refreshStatus}
          />
        )
      case 'Conflicts':
        return (
          <ConflictsTab
            conflictedFiles={conflictedFiles}
            onRefresh={refreshStatus}
          />
        )
      case 'Repository Health':
        return (
          <HealthAnalyzerTab 
            currentPath={currentPath}
            analyzeHealth={analyzeHealth}
          />
        )
      case 'Publish':
        return (
          <PublishView
            currentPath={currentPath}
            isRepo={isRepo}
            remotes={remotes}
            status={status}
            remoteStatus={remoteStatus}
            onInit={initRepo}
            onAddRemote={addRemote}
            onCommit={commit}
            onPull={pull}
            onPush={push}
            onRefresh={refreshStatus}
            onSetupAutoUpdate={setupAutoUpdate}
            onCheckAutoUpdate={checkAutoUpdate}
            onGetLatestRemoteTag={getLatestRemoteTag}
            onGetCommitDelta={getCommitDelta}
          />
        )
      case 'Settings':
        return <SettingsView />
      default:
        return <div>Select a tab</div>
    }
  }

  return (
    <>
      <Head>
        <title>GitPush GUI</title>
      </Head>
      <Layout
        currentPath={currentPath || ''}
        onSelectFolder={selectFolder}
        terminalOutput={logs}
        onRunCommand={runManualCommand}
        onClearTerminal={clearLogs}
        activeTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
        hasConflicts={conflictedFiles && conflictedFiles.length > 0}
      >
        {renderContent()}
      </Layout>
    </>
  )
}
