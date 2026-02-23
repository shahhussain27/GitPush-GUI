import React, { useEffect, useState } from 'react'
import { 
  History, 
  RefreshCcw, 
  Hash, 
  User, 
  Calendar, 
  MessageSquare, 
  Search,
  ExternalLink,
  Clipboard
} from 'lucide-react'
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Badge } from "./ui/badge"

interface Commit {
  hash: string
  author: string
  date: string
  subject: string
}

const HistoryView: React.FC = () => {
  const [commits, setCommits] = useState<Commit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredCommits = commits.filter(c => 
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-8 py-6 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20">
            <History className="size-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Commit Genealogy</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Chronological timeline of changes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-600" />
            <input 
              type="text"
              placeholder="Filter history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-gray-700 font-medium"
            />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            className="rounded-xl border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-400 gap-2 h-9 px-4"
          >
            <RefreshCcw className={isLoading ? "size-4 animate-spin" : "size-4"} />
            Sync
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-950/30 text-gray-500 uppercase text-[9px] font-black tracking-[0.2em] border-b border-gray-800 sticky top-0 backdrop-blur-sm">
            <tr>
              <th className="px-8 py-4"><div className="flex items-center gap-2"><Hash className="size-3" /> Hash</div></th>
              <th className="px-8 py-4"><div className="flex items-center gap-2"><MessageSquare className="size-3" /> Subject</div></th>
              <th className="px-8 py-4"><div className="flex items-center gap-2"><User className="size-3" /> Author</div></th>
              <th className="px-8 py-4"><div className="flex items-center gap-2"><Calendar className="size-3" /> Date</div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-8 py-6"><div className="h-2 bg-gray-800 rounded w-16"></div></td>
                  <td className="px-8 py-6"><div className="h-2 bg-gray-800 rounded w-48"></div></td>
                  <td className="px-8 py-6"><div className="h-2 bg-gray-800 rounded w-24"></div></td>
                  <td className="px-8 py-6"><div className="h-2 bg-gray-800 rounded w-32"></div></td>
                </tr>
              ))
            ) : filteredCommits.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                   <div className="bg-gray-800/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="size-8 text-gray-700" />
                   </div>
                   <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">No matching records found</p>
                </td>
              </tr>
            ) : (
              filteredCommits.map((commit) => (
                <tr key={commit.hash} className="group hover:bg-blue-500/[0.02] transition-colors cursor-default">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-400/70 font-black group-hover:text-blue-400 transition-colors">
                        {commit.hash.slice(0, 7)}
                      </span>
                      <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy ID">
                        <Clipboard className="size-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-200 group-hover:text-white transition-colors max-w-sm truncate leading-relaxed">
                      {commit.subject}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className="size-6 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                         {commit.author.charAt(0).toUpperCase()}
                       </div>
                       <span className="font-medium text-gray-400 group-hover:text-gray-300">{commit.author}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-gray-600 font-mono text-[10px] tabular-nums">
                    {commit.date}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  )
}

export default HistoryView
