import React from 'react'

interface RemoteUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onPull: () => void
  behindCount: number
  metadata: {
    hash: string
    author: string
    message: string
  } | null
}

const RemoteUpdateModal: React.FC<RemoteUpdateModalProps> = ({ isOpen, onClose, onPull, behindCount, metadata }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-amber-500/10 animate-in zoom-in-95 duration-300">
        <div className="px-8 pt-8 pb-6 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <span className="text-xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white">New Changes Detected</h2>
          </div>
          <p className="text-amber-200/60 text-xs">The remote repository is ahead of your local branch.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Commits Fetching</span>
              <span className="bg-amber-500/20 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                {behindCount} NEW
              </span>
            </div>

            {metadata && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                    {metadata.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white line-clamp-2">{metadata.message}</p>
                    <p className="text-[10px] text-gray-500 mt-1">by {metadata.author} • {metadata.hash.slice(0, 7)}</p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-400 leading-relaxed italic">
              Pulling changes first is highly recommended to avoid complex merge conflicts later.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-gray-800 text-gray-500 text-sm font-bold hover:bg-gray-800 hover:text-gray-300 transition-colors"
            >
              Later
            </button>
            <button 
              onClick={() => {
                onPull()
                onClose()
              }}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center gap-2"
            >
              <span>⬇️</span> Pull & Rebase Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemoteUpdateModal
