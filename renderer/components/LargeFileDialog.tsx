import React from 'react';
import { AlertTriangle, HardDrive, Database, ShieldAlert, FileWarning, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface ScannedFile {
  path: string;
  sizeBytes: number;
  sizeMB: number;
  action: 'BLOCK' | 'WARN' | 'LFS' | 'NONE';
  extension: string;
}

interface LargeFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: ScannedFile[];
  onTrackLFS: (pattern: string) => void;
  onIgnore: (path: string) => void;
  onProceedAnyway: () => void;
  isPush: boolean;
}

const LargeFileDialog: React.FC<LargeFileDialogProps> = ({ 
  isOpen, 
  onClose, 
  files, 
  onTrackLFS, 
  onIgnore, 
  onProceedAnyway,
  isPush
}) => {
  if (!isOpen || files.length === 0) return null;

  const hasBlocks = files.some(f => f.action === 'BLOCK');
  const hasWarns = files.some(f => f.action === 'WARN');
  
  // Highest severity
  const severity = hasBlocks ? 'BLOCK' : (hasWarns ? 'WARN' : 'LFS');

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-gray-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 w-full max-w-3xl rounded-3xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className={`p-6 border-b border-gray-800/50 flex justify-between items-center relative overflow-hidden ${
          severity === 'BLOCK' ? 'bg-red-500/10 border-red-500/20' : 
          severity === 'WARN' ? 'bg-amber-500/10 border-amber-500/20' : 
          'bg-blue-500/10 border-blue-500/20'
        }`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`p-3 rounded-2xl ${
              severity === 'BLOCK' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 
              severity === 'WARN' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
              'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}>
              {severity === 'BLOCK' ? <ShieldAlert className="size-6" /> : 
               severity === 'WARN' ? <AlertTriangle className="size-6" /> : 
               <HardDrive className="size-6" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {severity === 'BLOCK' ? 'Push Blocked: Large Files Detected' : 
                 severity === 'WARN' ? 'Warning: Very Large Files Detected' : 
                 'Git LFS Recommendation'}
              </h2>
              <p className={`text-sm font-medium ${
                severity === 'BLOCK' ? 'text-red-400' : 
                severity === 'WARN' ? 'text-amber-400' : 
                'text-blue-400'
              }`}>
                {severity === 'BLOCK' ? 'Files exceeding 100MB cannot be pushed to GitHub.' : 
                 severity === 'WARN' ? 'Files exceeding 50MB may slow down your repository.' : 
                 'We detected files that are better handled by Git Large File Storage.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar bg-gray-950/30">
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-900 border border-gray-800/80 rounded-2xl gap-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <FileWarning className={`size-5 shrink-0 ${
                    file.action === 'BLOCK' ? 'text-red-500' : 
                    file.action === 'WARN' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-gray-300 truncate font-medium">{file.path}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[9px] font-black tracking-widest px-1.5 py-0 h-4 border ${
                        file.action === 'BLOCK' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        file.action === 'WARN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {file.sizeMB.toFixed(1)} MB
                      </Badge>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                        {file.extension || 'No Extension'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    onClick={() => onTrackLFS(file.extension ? `*${file.extension}` : file.path)}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 gap-2 font-bold shadow-lg shadow-blue-900/20"
                  >
                    <Database className="size-3.5" />
                    Track with LFS
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onIgnore(file.path)}
                    className="flex-1 sm:flex-none bg-gray-950 hover:bg-gray-800 border-gray-800 text-gray-300 text-xs h-9 font-bold"
                  >
                    Add to .gitignore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800/50 bg-gray-900/80 flex justify-between items-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            {files.length} large file{files.length !== 1 && 's'} detected
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white uppercase text-xs font-black tracking-widest">
              Cancel {isPush ? 'Push' : 'Commit'}
            </Button>
            
            <Button 
              onClick={onProceedAnyway}
              disabled={severity === 'BLOCK'}
              className={`text-xs font-black gap-2 shadow-lg tracking-widest uppercase ${
                severity === 'BLOCK' 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'
              }`}
            >
              {severity === 'BLOCK' ? 'Fix Required to Proceed' : 'Proceed Anyway'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LargeFileDialog;
