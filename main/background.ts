import path from 'path'
import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { gitService } from './services/gitService'
import { lfsService } from './services/lfsService'
import { gitignoreService } from './services/gitignoreService'
import { GitHubService } from './services/githubService'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

autoUpdater.logger = log
log.transports.file.level = 'info'

const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  // --- Splash Screen ---
  const splashWindow = new BrowserWindow({
    width: 450,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))

  const mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    show: false, // Don't show the window yet
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // When main window is ready to show
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow.destroy()
      mainWindow.show()
    }, 2000) // Delay to show splash screen for at least 2 seconds
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    // mainWindow.webContents.openDevTools()
  }

  function sendStatusToWindow(text: string, data?: any) {
    log.info(text, data)
    mainWindow.webContents.send('update-message', { text, data })
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...')
  })
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.', info)
  })
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.', info)
  })
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + (err instanceof Error ? err.message : String(err)))
  })
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('Download progress...', progressObj)
  })
  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded', info)
  })

  log.info(`[App] Starting in ${isProd ? 'production' : 'development'} mode`)

  if (isProd) {
    autoUpdater.checkForUpdatesAndNotify()
    log.info('[Updater] Checking for updates...')
  } else {
    log.info('[Updater] Skipped update check in development mode')
  }

  // IPC Handlers
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    const folderPath = result.filePaths[0]
    gitService.setPath(folderPath)
    return folderPath
  })

  ipcMain.handle('git:is-repo', async () => {
    return await gitService.isRepo()
  })

  ipcMain.handle('git:status', async () => {
    return await gitService.getStatus()
  })

  ipcMain.handle('git:branch', async () => {
    return await gitService.getCurrentBranch()
  })

  ipcMain.handle('git:init', async () => {
    return await gitService.init()
  })

  ipcMain.handle('git:add', async (_event, files) => {
    return await gitService.add(files)
  })

  ipcMain.handle('git:commit', async (_event, message) => {
    return await gitService.commit(message)
  })

  ipcMain.handle('git:push', async (_event, remote, branch) => {
    return await gitService.push(remote, branch)
  })

  ipcMain.handle('git:pull', async (_event, remote, branch) => {
    return await gitService.pull(remote, branch)
  })

  ipcMain.handle('git:remotes', async () => {
    return await gitService.getRemotes()
  })

  ipcMain.handle('git:add-remote', async (_event, name, url) => {
    return await gitService.addRemote(name, url)
  })

  ipcMain.handle('git:remote-remove', async (_event, name) => {
    return await gitService.removeRemote(name)
  })

  ipcMain.handle('git:fetch', async () => {
    return await gitService.fetch()
  })

  ipcMain.handle('git:execute-command', async (_event, command) => {
    // Basic safety check: only allow git commands
    if (!command.trim().startsWith('git ')) {
      throw new Error('Invalid command. Only "git" commands are allowed.');
    }
    const args = command.trim().split(/\s+/).slice(1);
    return await gitService.execute(args);
  })

  ipcMain.handle('git:log', async () => {
    return await gitService.getLog()
  })

  ipcMain.handle('git:config-get', async (_event, key) => {
    return await gitService.getConfig(key)
  })

  ipcMain.handle('git:config-set', async (_event, key, value) => {
    return await gitService.setConfig(key, value)
  })

  ipcMain.handle('lfs:is-installed', async () => {
    return await lfsService.isLFSInstalled()
  })

  ipcMain.handle('lfs:install', async () => {
    return await lfsService.install()
  })

  ipcMain.handle('lfs:track', async (_event, pattern) => {
    return await lfsService.track(pattern)
  })

  ipcMain.handle('gitignore:generate', async (_event, path, type) => {
    return await gitignoreService.generate(path, type)
  })

  ipcMain.handle('gitignore:read', async (_event, path) => {
    return await gitignoreService.read(path)
  })

  ipcMain.handle('gitignore:save', async (_event, path, content) => {
    return await gitignoreService.save(path, content)
  })

  ipcMain.handle('git:check-updates', async () => {
    try {
      // 1. Fetch remote changes
      await gitService.execute(['fetch']);
      
      // 2. Get status (ahead/behind)
      const status = await gitService.getStatusDetails();
      
      // 3. If behind, get metadata
      let metadata = null;
      if (status.behind > 0) {
        metadata = await gitService.getRemoteMetadata();
      }
      
      return {
        success: true,
        ...status,
        metadata
      };
    } catch (error: any) {
      // It might fail if no upstream is set, which is fine
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('github:create-repo', async (_event, { token, name, isPrivate }) => {
    try {
      // 1. Create repo on GitHub
      const repoInfo = await GitHubService.createRepo(token, name, isPrivate);
      
      // 2. Add remote origin
      // Check if remote already exists
      const existingRemotes = await gitService.getRemotes();
      if (existingRemotes.includes('origin')) {
        await gitService.execute(['remote', 'remove', 'origin']);
      }
      
      await gitService.addRemote('origin', repoInfo.clone_url);
      
      // 3. Initial push
      const currentBranch = await gitService.getCurrentBranch();
      const pushResult = await gitService.push('origin', currentBranch);
      
      return {
        success: true,
        repoInfo,
        pushResult
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('github:get-repo-details', async (_event, { token, owner, repo }) => {
    try {
      const details = await GitHubService.getRepoDetails(token, owner, repo);
      return { success: true, details };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:list-collaborators', async (_event, { token, owner, repo }) => {
    try {
      const collaborators = await GitHubService.listCollaborators(token, owner, repo);
      return { success: true, collaborators };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:add-collaborator', async (_event, { token, owner, repo, username, permission }) => {
    try {
      await GitHubService.addCollaborator(token, owner, repo, username, permission);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:remove-collaborator', async (_event, { token, owner, repo, username }) => {
    try {
      await GitHubService.removeCollaborator(token, owner, repo, username);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:add-team-repo', async (_event, { token, org, team, owner, repo, permission }) => {
    try {
      await GitHubService.addRepoToTeam(token, org, team, owner, repo, permission);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('project:get-version', async () => {
    try {
      const fs = require('fs')
      const path = require('path')
      const projectPath = gitService.getPath()
      if (!projectPath) return null
      const pkgPath = path.join(projectPath, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        return pkg.version
      }
      return null
    } catch (error) {
      console.error('Error getting project version:', error)
      return null
    }
  })

  ipcMain.handle('project:set-version', async (_event, version) => {
    try {
      const fs = require('fs')
      const path = require('path')
      const projectPath = gitService.getPath()
      if (!projectPath) throw new Error('No project path set')
      const pkgPath = path.join(projectPath, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        pkg.version = version
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
        return { success: true }
      }
      throw new Error('package.json not found')
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('update:check', async () => {
    if (isProd) {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, info: result ? result.updateInfo : null }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    } else {
      return { success: false, error: 'Update checks are disabled in development mode.' }
    }
  })

  // Window Controls
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('window:close', () => {
    mainWindow.close()
  })

  // Dialogs
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    })
    return result
  })

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result
  })

})()

app.on('window-all-closed', () => {
  app.quit()
})
