import React from 'react';
import { ProcessedCommitNode } from '../lib/graphEngine';
import { GitBranch, CornerUpLeft, Copy, Clock, Hash, Check } from 'lucide-react';

interface GraphContextMenuProps {
  x: number;
  y: number;
  commit: ProcessedCommitNode;
  onClose: () => void;
  onCheckout: () => void;
  onCreateBranch: () => void;
  onCherryPick: () => void;
  onRevert: () => void;
  onCopyHash: () => void;
}

const GraphContextMenu: React.FC<GraphContextMenuProps> = ({ 
  x, y, commit, onClose, onCheckout, onCreateBranch, onCherryPick, onRevert, onCopyHash 
}) => {
  return (
    <>
      {/* Background overlay to capture clicks outside */}
      <div className="fixed inset-0 z-[1000]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      
      <div 
        className="fixed z-[1001] w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ top: Math.min(y, window.innerHeight - 250), left: Math.min(x, window.innerWidth - 260) }}
      >
        <div className="p-3 border-b border-gray-800/50 bg-gray-950/50">
          <p className="text-xs font-mono font-bold text-white mb-1"><Hash className="size-3 inline mr-1 text-gray-500" />{commit.hash.substring(0, 7)}</p>
          <p className="text-[10px] text-gray-400 truncate">{commit.message}</p>
        </div>

        <div className="p-1.5 flex flex-col gap-0.5">
          <MenuButton icon={<Check className="size-4 text-emerald-500" />} label="Checkout Commit" onClick={() => { onCheckout(); onClose(); }} />
          <MenuButton icon={<GitBranch className="size-4 text-blue-500" />} label="Create Branch Here" onClick={() => { onCreateBranch(); onClose(); }} />
          
          <div className="h-px bg-gray-800/50 my-1 mx-2" />
          
          <MenuButton icon={<CornerUpLeft className="size-4 text-amber-500" />} label="Cherry-pick Commit" onClick={() => { onCherryPick(); onClose(); }} />
          <MenuButton icon={<Clock className="size-4 text-red-500" />} label="Revert Commit" onClick={() => { onRevert(); onClose(); }} />
          
          <div className="h-px bg-gray-800/50 my-1 mx-2" />
          
          <MenuButton icon={<Copy className="size-4 text-gray-400" />} label="Copy SHA" onClick={() => { onCopyHash(); onClose(); }} />
        </div>
      </div>
    </>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full text-left px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg flex items-center gap-3 transition-colors"
  >
    {icon}
    {label}
  </button>
);

export default GraphContextMenu;
