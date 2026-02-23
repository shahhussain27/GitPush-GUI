import React, { useEffect, useState } from 'react'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

interface ProgressInfo {
  percent: number
  bytesPerSecond: number
}

const UpdateStatus: React.FC = () => {
  const [status, setStatus] = useState<string>('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = window.ipc.on('update-message', (data: any) => {
      const { text, data: payload } = data
      console.log('Update Event:', text, payload)
      
      setStatus(text)

      if (text.startsWith('Update available.')) {
        setUpdateInfo(payload)
        setShow(true)
      } else if (text.startsWith('Download progress...')) {
        setProgress(payload)
      } else if (text.startsWith('Update downloaded')) {
        setStatus('Ready to install!')
        setShow(true)
      } else if (text.startsWith('Error in auto-updater.')) {
        setShow(true)
        // Hide after some time if it's an error
        setTimeout(() => setShow(false), 8000)
      }
    })

    return () => {
      unsub && unsub()
    }
  }, [])

  const handleInstall = async () => {
    await window.ipc.invoke('update:install')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-gray-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden backdrop-blur-md bg-opacity-95">
        <div className="p-5 flex items-start gap-4">
          <div className="bg-blue-600/20 p-2.5 rounded-xl">
            <span className="text-xl">🚀</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              Software Update Available
            </h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              New version {updateInfo?.version ? `v${updateInfo.version}` : ''} is ready. 
              {status === 'Ready to install!' ? ' Restart now to apply.' : ' Downloading...'}
            </p>
            
            {progress && status !== 'Ready to install!' && (
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${Math.round(progress.percent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                  <span>{Math.round(progress.percent)}%</span>
                  <span>{(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s</span>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShow(false)}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {status === 'Ready to install!' && (
          <div className="px-5 pb-5 flex gap-2">
            <button 
              onClick={handleInstall}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-2 rounded-lg transition-all shadow-lg shadow-blue-900/40"
            >
              Restart & Install
            </button>
            <button 
              onClick={() => setShow(false)}
              className="px-4 py-2 border border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300 text-[11px] font-medium rounded-lg transition-colors"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdateStatus
