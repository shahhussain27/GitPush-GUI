import React, { useEffect, useState } from 'react'

const SettingsView: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [n, e] = await Promise.all([
          window.ipc.invoke('git:config-get', 'user.name'),
          window.ipc.invoke('git:config-get', 'user.email')
        ])
        setName(n as string)
        setEmail(e as string)
      } catch (err) {
        console.error('Failed to load config:', err)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')
    try {
      await Promise.all([
        window.ipc.invoke('git:config-set', 'user.name', name),
        window.ipc.invoke('git:config-set', 'user.email', email)
      ])
      setMessage('✅ Settings saved globally!')
    } catch (err) {
      setMessage('❌ Failed to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Git Global Identity</h2>
            <p className="text-gray-400 text-sm">Configure your default author name and email for all repositories.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-white placeholder:text-gray-600 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-white placeholder:text-gray-600 font-medium"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-blue-400 font-medium">{message}</p>
            <button 
              type="submit"
              disabled={isSaving}
              className={`px-8 py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
                isSaving 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
              }`}
            >
              {isSaving ? 'Saving...' : 'Update Identity'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl italic">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Note:</strong> These settings run the `git config --global` command. They will apply to all commits you make on this system. repo-specific settings are not yet modularly supported.
        </p>
      </div>
    </div>
  )
}

export default SettingsView
