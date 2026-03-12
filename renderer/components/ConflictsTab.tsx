import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { FileWarning, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import ConflictResolver from './ConflictResolver';

interface ConflictsTabProps {
  conflictedFiles: string[];
  onRefresh: () => void;
}

export default function ConflictsTab({ conflictedFiles, onRefresh }: ConflictsTabProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      loadFile(selectedFile);
    } else {
      setRawContent('');
    }
  }, [selectedFile]);

  // Auto-select first file if none selected
  useEffect(() => {
    if (conflictedFiles.length > 0 && !selectedFile) {
      setSelectedFile(conflictedFiles[0]);
    } else if (conflictedFiles.length === 0) {
      setSelectedFile(null);
    }
  }, [conflictedFiles, selectedFile]);

  const loadFile = async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const res = await window.ipc.invoke('fs:read-file', filePath);
      if (res.success) {
        setRawContent(res.content);
      } else {
        setError(res.error || 'Failed to read file');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveResolution = async (resolvedContent: string) => {
    if (!selectedFile) return;
    try {
      // @ts-ignore
      const res = await window.ipc.invoke('fs:write-file', selectedFile, resolvedContent);
      if (res.success) {
        setSelectedFile(null);
        onRefresh();
      } else {
        setError(res.error || 'Failed to save file');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (conflictedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full animate-in fade-in duration-500">
        <CheckCircle className="size-16 text-green-500/50 mb-4" />
        <h3 className="text-xl font-bold text-gray-200">No Merge Conflicts</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          Your repository is in a clean state. Continue merging, rebasing, or pulling to see conflicts here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-300">
      {/* Sidebar: Conflicted Files List */}
      <div className="w-64 flex flex-col bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shrink-0">
        <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className="size-4 text-amber-500" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Conflicts</span>
          </div>
          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-full">
            {conflictedFiles.length}
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conflictedFiles.map((file) => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  "w-full text-left flex items-center justify-between p-2 rounded-md text-sm transition-all group",
                  selectedFile === file 
                    ? "bg-blue-600/10 text-blue-400 font-medium" 
                    : "text-gray-400 hover:bg-gray-900/50 hover:text-gray-200"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate">{file}</span>
                </div>
                {selectedFile === file && <ChevronRight className="size-4 opacity-50" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {selectedFile ? (
          isLoading ? (
            <div className="flex-1 border border-gray-800 rounded-xl bg-gray-950 flex items-center justify-center">
              <span className="text-gray-500 animate-pulse text-sm">Loading conflict data...</span>
            </div>
          ) : (
            <div className="flex-1 h-full">
               <ConflictResolver 
                 filePath={selectedFile}
                 rawContent={rawContent}
                 onSave={handleSaveResolution}
                 onCancel={() => setSelectedFile(null)}
               />
            </div>
          )
        ) : (
          <div className="flex-1 border border-gray-800 border-dashed rounded-xl bg-gray-950/50 flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm text-center">
              Select a file from the sidebar<br/>to resolve conflicts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
