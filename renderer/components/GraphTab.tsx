import React, { useState, useEffect } from 'react';
import { CommitNodeRaw } from '../../main/services/gitService';
import { ProcessedCommitNode } from '../lib/graphEngine';
import CommitGraphView from './CommitGraphView';
import GraphContextMenu from './GraphContextMenu';
import { RefreshCw, GitCommit, User, Calendar, FileText, CheckCircle2, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface GraphTabProps {
  currentPath: string;
  isRepo: boolean;
  onRefreshBranch: () => void;
}

const GraphTab: React.FC<GraphTabProps> = ({ currentPath, isRepo, onRefreshBranch }) => {
  const [commits, setCommits] = useState<CommitNodeRaw[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<ProcessedCommitNode | null>(null);
  const [commitDetails, setCommitDetails] = useState<{ files: { action: string, path: string }[], body: string } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, commit: ProcessedCommitNode } | null>(null);

  const loadGraph = async () => {
    if (!isRepo) return;
    setIsLoading(true);
    try {
      // Load max 500 commits for performance
      const data = await window.ipc.invoke('git:get-commit-graph', 500) as CommitNodeRaw[];
      setCommits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [currentPath, isRepo]);

  useEffect(() => {
    if (selectedCommit) {
      loadCommitDetails(selectedCommit.hash);
    }
  }, [selectedCommit]);

  const loadCommitDetails = async (hash: string) => {
    setIsLoadingDetails(true);
    setCommitDetails(null);
    try {
      const details = await window.ipc.invoke('git:get-commit-details', hash);
      setCommitDetails(details as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, commit: ProcessedCommitNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, commit });
  };

  // Actions
  const handleCheckout = async (hash: string) => {
    try {
      await window.ipc.invoke('git:checkout', hash);
      onRefreshBranch();
      loadGraph();
    } catch (e) {
      alert('Checkout failed. Ensure you have a clean working directory.');
    }
  };

  const handleCreateBranch = async (hash: string) => {
    const name = prompt('New branch name:');
    if (!name) return;
    try {
      await window.ipc.invoke('git:create-branch', name, hash);
      await window.ipc.invoke('git:checkout', name);
      onRefreshBranch();
      loadGraph();
    } catch (e) {
      alert('Branch creation failed.');
    }
  };

  const handleCherryPick = async (hash: string) => {
    if(!confirm(`Cherry-pick commit ${hash.substring(0,7)} into current branch?`)) return;
    try {
      await window.ipc.invoke('git:cherry-pick', hash);
      onRefreshBranch();
      loadGraph();
    } catch (e) {
      alert('Cherry-pick failed or has conflicts. Resolve in status tab.');
    }
  };

  const handleRevert = async (hash: string) => {
    if(!confirm(`Revert commit ${hash.substring(0,7)}? This creates a new commit undoing its changes.`)) return;
    try {
      await window.ipc.invoke('git:revert', hash);
      loadGraph();
    } catch (e) {
      alert('Revert failed or has conflicts.');
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  if (!isRepo) {
    return <div className="p-8 text-center text-gray-500">Not a Git repository</div>;
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in duration-500">
      
      {/* Left Panel: Graph Canvas */}
      <div className="flex-1 border-r border-gray-800/50 flex flex-col relative bg-gray-950">
        <div className="p-3 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <GitCommit className="size-5 text-blue-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Commit Graph</h2>
            <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 font-black h-4 px-1.5 ml-2">500 MAX</Badge>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={loadGraph} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </Button>
        </div>
        
        <div className="flex-1 relative overflow-hidden">
          {isLoading && commits.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="size-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <CommitGraphView 
              commits={commits} 
              onCommitSelect={setSelectedCommit} 
              selectedHash={selectedCommit?.hash}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
      </div>

      {/* Right Panel: Details */}
      <div className="w-[400px] flex flex-col bg-gray-900 hidden lg:flex">
        <div className="p-4 bg-gray-950 border-b border-gray-800/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle2 className="size-24 text-gray-500" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="size-3" /> Commit Inspector
          </h3>
          
          {selectedCommit ? (
            <div className="space-y-4 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-black text-base leading-tight mb-2 break-words pr-4">
                    {selectedCommit.message}
                  </h4>
                  <div className="flex items-center gap-2 mb-1 text-gray-400 text-xs font-mono">
                    <User className="size-3" /> {selectedCommit.author}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase">
                    <Calendar className="size-3" /> {new Date(selectedCommit.date).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCopyHash(selectedCommit.hash)}
                  className="bg-gray-900 border-gray-800 text-gray-400 hover:text-white h-7 text-[10px] font-mono gap-2"
                >
                  <Copy className="size-3" />
                  {selectedCommit.hash.substring(0, 7)}
                </Button>
                {selectedCommit.branchTags && selectedCommit.branchTags.map(tag => (
                  <Badge key={tag} className="border-none bg-blue-500/20 text-blue-400 text-[9px] font-black h-7">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
             <div className="py-10 text-center text-gray-600 font-medium text-xs">
               Select a commit to view details
             </div>
          )}
        </div>

        {selectedCommit && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            
            {/* Extended Message Body */}
            {isLoadingDetails ? (
               <div className="flex justify-center p-8"><RefreshCw className="size-5 animate-spin text-gray-700" /></div>
            ) : commitDetails ? (
              <>
                {commitDetails.body && commitDetails.body !== selectedCommit.message && (
                  <div className="bg-gray-950/50 border border-gray-800/50 p-4 rounded-xl text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {commitDetails.body}
                  </div>
                )}
                
                {/* Files Changed */}
                <div>
                  <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-black tracking-widest text-gray-500">
                    <span>{commitDetails.files.length} Files Changed</span>
                  </div>
                  
                  <div className="bg-gray-950 rounded-xl border border-gray-800/50 overflow-hidden">
                    {commitDetails.files.map((f, i) => {
                       const isAdded = f.action.startsWith('A');
                       const isDeleted = f.action.startsWith('D');
                       const isModified = f.action.startsWith('M');
                       
                       let color = 'text-gray-400';
                       let bgToken = 'bg-gray-500/10';
                       let label = 'M';
                       
                       if (isAdded) { color = 'text-green-500'; bgToken = 'bg-green-500/10'; label = 'A'; }
                       if (isDeleted) { color = 'text-red-500'; bgToken = 'bg-red-500/10'; label = 'D'; }
                       if (isModified) { color = 'text-amber-500'; bgToken = 'bg-amber-500/10'; label = 'M'; }

                       return (
                         <div key={i} className="flex items-center gap-3 p-2.5 border-b border-gray-800/30 last:border-b-0 group">
                           <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${bgToken} ${color} shrink-0`}>
                             {label}
                           </div>
                           <p className="font-mono text-[11px] text-gray-300 truncate group-hover:text-blue-400 transition-colors cursor-default" title={f.path}>
                             {f.path}
                           </p>
                         </div>
                       )
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {contextMenu && (
        <GraphContextMenu 
          x={contextMenu.x}
          y={contextMenu.y}
          commit={contextMenu.commit}
          onClose={() => setContextMenu(null)}
          onCheckout={() => handleCheckout(contextMenu.commit.hash)}
          onCreateBranch={() => handleCreateBranch(contextMenu.commit.hash)}
          onCherryPick={() => handleCherryPick(contextMenu.commit.hash)}
          onRevert={() => handleRevert(contextMenu.commit.hash)}
          onCopyHash={() => handleCopyHash(contextMenu.commit.hash)}
        />
      )}
    </div>
  );
};

export default GraphTab;
