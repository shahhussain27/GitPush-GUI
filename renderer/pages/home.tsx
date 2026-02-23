import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import RepositoryView from '../components/RepositoryView'
import HistoryView from '../components/HistoryView'
import SettingsView from '../components/SettingsView'
import PublishView from '../components/PublishView'
import { useGit } from '../hooks/useGit'

export default function HomePage() {
  const { 
    currentPath, 
    isRepo, 
    status, 
    branch, 
    logs, 
    selectFolder, 
    initRepo, 
    commit, 
    push, 
    pull,
    remotes,
    isLoading,
    currentError,
    refreshStatus,
    applyFix,
    runManualCommand,
    clearLogs,
    createGitHubRepo,
    removeRemote,
    remoteStatus,
    checkRemoteUpdates,
    getRepoDetails,
    listCollaborators,
    addCollaborator,
    removeCollaborator,
    addTeamRepo
  } = useGit()

  const [activeSidebarTab, setActiveSidebarTab] = useState('Status')

  useEffect(() => {
    if (currentPath) {
      refreshStatus()
      checkRemoteUpdates()
      const statusInterval = setInterval(refreshStatus, 5000)
      const updateInterval = setInterval(checkRemoteUpdates, 30000) // Check updates every 30s
      return () => {
        clearInterval(statusInterval)
        clearInterval(updateInterval)
      }
    }
  }, [currentPath, refreshStatus, checkRemoteUpdates])

  const renderContent = () => {
    if (!currentPath) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-10">
          <div className="text-6xl mb-6">🚀</div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to GitPush GUI</h1>
          <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
            Select a project folder to start managing your repository. 
            GitPush GUI makes it easy to stage, commit, and push your projects with a modern interface.
          </p>
          <button 
            onClick={selectFolder}
            className="mt-8 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/40"
          >
            Get Started
          </button>
        </div>
      )
    }

    switch (activeSidebarTab) {
      case 'History':
        return <HistoryView />
      case 'Publish':
        return <PublishView currentPath={currentPath} onRefresh={refreshStatus} />
      case 'Settings':
        return <SettingsView />
      case 'Changes':
      case 'Status':
      default:
        return (
          <RepositoryView
            currentPath={currentPath}
            isRepo={isRepo}
            status={status}
            branch={branch}
            onInit={initRepo}
            onCommit={commit}
            onPush={push}
            onPull={pull}
            isLoading={isLoading}
            currentError={currentError}
            onApplyFix={applyFix}
            onGitHubCreate={createGitHubRepo}
            onRemoveRemote={removeRemote}
            remoteStatus={remoteStatus}
            onListCollaborators={listCollaborators}
            onAddCollaborator={addCollaborator}
            onRemoveCollaborator={removeCollaborator}
            onGetRepoDetails={getRepoDetails}
            onAddTeamRepo={addTeamRepo}
          />
        )
    }
  }

  return (
    <React.Fragment>
      <Head>
        <title>GitPush GUI</title>
      </Head>
      <Layout 
        currentPath={currentPath} 
        onSelectFolder={selectFolder} 
        terminalOutput={logs}
        onRunCommand={runManualCommand}
        onClearTerminal={clearLogs}
        activeTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
      >
        {renderContent()}
      </Layout>
    </React.Fragment>
  )
}
