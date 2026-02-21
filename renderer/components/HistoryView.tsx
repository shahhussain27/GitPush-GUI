import React, { useEffect, useState } from 'react'

interface Commit {
  hash: string
  author: string
  date: string
  subject: string
}

const HistoryView: React.FC = () => {
  const [commits, setCommits] = useState<Commit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const result = await window.ipc.invoke('git:log')
      if (result.stdout) {
        const lines = result.stdout.trim().split('\n')
        const parsed = lines.map((line: string) => {
          const [hash, author, date, subject] = line.split('|')
          return { hash, author, date, subject }
        })
        setCommits(parsed)
      }
    } catch (e) {
      console.error('Failed to fetch history:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl animate-in fade-in duration-300">
      <div className="px-6 py-4 bg-gray-800/30 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white uppercase tracking-tight">Commit History</h2>
        <button 
          onClick={fetchHistory}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-950/30 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-800">
            <tr>
              <th className="px-6 py-3">Hash</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
                  Loading history...
                </td>
              </tr>
            ) : commits.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
                  No commits found.
                </td>
              </tr>
            ) : (
              commits.map((commit) => (
                <tr key={commit.hash} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-blue-400 opacity-80 decoration-dotted underline cursor-help" title={commit.hash}>
                    {commit.hash.slice(0, 7)}
                  </td>
                  <td className="px-6 py-4 font-medium text-white max-w-xs truncate">
                    {commit.subject}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {commit.author}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {commit.date}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HistoryView
