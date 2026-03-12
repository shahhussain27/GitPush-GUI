import React, { useState, useEffect } from 'react';
import { GitBranch, ChevronDown, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface BranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
}

interface BranchManagerProps {
  currentBranch: string;
  onBranchChange: () => void;
}

const BranchManager: React.FC<BranchManagerProps> = ({ currentBranch, onBranchChange }) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const result = await window.ipc.invoke('git:branches');
      setBranches(result as BranchInfo[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen, currentBranch]);

  const handleSwitchBranch = async (branchName: string) => {
    setIsLoading(true);
    try {
      await window.ipc.invoke('git:checkout', branchName);
      setIsOpen(false);
      onBranchChange();
    } catch (e) {
      console.error(e);
      alert('Failed to switch branch. Check if you have uncommitted changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName || newName === currentBranch) return;
    setIsLoading(true);
    try {
      await window.ipc.invoke('git:branch-rename', currentBranch, newName);
      setIsRenaming(false);
      onBranchChange();
    } catch (e) {
      console.error(e);
      alert('Failed to rename branch.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertDefault = async (target: 'main' | 'master') => {
    if (!confirm(`Are you sure you want to convert the default branch to ${target}? This will rename the branch locally and push it to origin.`)) return;
    
    setIsLoading(true);
    try {
      const current = currentBranch;
      await window.ipc.invoke('git:branch-rename', current, target);
      await window.ipc.invoke('git:push', 'origin', target);
      await window.ipc.invoke('git:delete-remote-branch', 'origin', current);
      await window.ipc.invoke('git:set-upstream', target, 'origin');
      onBranchChange();
    } catch (e) {
      console.error(e);
      alert(`Failed to convert branch to ${target}. Make sure you have push access and the new branch name is valid.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="flex flex-col gap-2">
      <div 
        className="flex items-center justify-between bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50 backdrop-blur-xl hover:border-blue-500/30 transition-all cursor-pointer"
        onClick={() => !isRenaming && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
            <GitBranch className="size-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Active Development Branch</h2>
            
            {isRenaming ? (
              <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  className="bg-gray-950 border border-blue-500/50 rounded-lg px-2 py-1 text-sm font-mono text-white outline-none w-32 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                />
                <button onClick={handleRename} className="p-1 hover:bg-green-500/20 text-green-500 rounded"><Check className="size-4" /></button>
                <button onClick={() => setIsRenaming(false)} className="p-1 hover:bg-red-500/20 text-red-500 rounded"><X className="size-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xl font-mono font-black text-white">
                  {currentBranch || 'N/A'}
                </p>
                <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 font-black px-1.5 h-4">LOCAL</Badge>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setNewName(currentBranch); setIsRenaming(true); }}
                  className="ml-2 p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                  title="Rename Branch"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        {!isRenaming && <ChevronDown className="size-5 text-gray-400" />}
      </div>
      
      {(currentBranch === 'master' || currentBranch === 'main') && !isRenaming && (
        <div className="flex px-1 gap-2">
            {currentBranch === 'master' && (
              <Button size="sm" variant="outline" className="h-6 text-[10px] bg-gray-900 border-gray-800 text-gray-400" onClick={(e) => { e.stopPropagation(); handleConvertDefault('main'); }}>
                <RefreshCw className="size-3 mr-1"/> Convert master → main
              </Button>
            )}
            {currentBranch === 'main' && (
              <Button size="sm" variant="outline" className="h-6 text-[10px] bg-gray-900 border-gray-800 text-gray-400" onClick={(e) => { e.stopPropagation(); handleConvertDefault('master'); }}>
                <RefreshCw className="size-3 mr-1"/> Convert main → master
              </Button>
            )}
        </div>
      )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
          <div className="p-3 border-b border-gray-800/50 bg-gray-950/50 font-black text-xs text-gray-400 uppercase tracking-widest flex justify-between items-center">
            <span>Switch Branch</span>
            {isLoading && <RefreshCw className="size-3 animate-spin text-blue-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {branches.map((b) => (
              <button
                key={`${b.isRemote ? 'remote' : 'local'}-${b.name}`}
                onClick={() => handleSwitchBranch(b.name)}
                disabled={b.isCurrent}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-sm font-mono transition-colors ${
                  b.isCurrent 
                    ? 'bg-blue-500/20 text-blue-400 cursor-default' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="truncate">{b.name}</span>
                </div>
                {b.isRemote && <Badge variant="outline" className="text-[8px] h-3 px-1 ml-2 border-amber-500/30 text-amber-500">REMOTE</Badge>}
              </button>
            ))}
            {branches.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-gray-500">No branches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManager;
