import React, { useState, useEffect } from 'react';
import { parseConflictFile, ParsedConflictElement, ConflictBlock } from '../lib/conflictParser';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Check, ArrowRight, ArrowLeft, Edit3, Save, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConflictResolverProps {
  filePath: string;
  rawContent: string;
  onSave: (resolvedContent: string) => Promise<void>;
  onCancel: () => void;
}

export default function ConflictResolver({ filePath, rawContent, onSave, onCancel }: ConflictResolverProps) {
  const [elements, setElements] = useState<ParsedConflictElement[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const parsed = parseConflictFile(rawContent);
    setElements(parsed);
    // Initialize resolutions
    const initialResolutions: Record<string, string> = {};
    parsed.forEach(el => {
      if (el.isConflict) {
        initialResolutions[el.id] = ''; // Empty means unresolved unless they type something
      }
    });
    setResolutions(initialResolutions);
  }, [rawContent]);

  const unresolvedCount = elements.filter(el => el.isConflict && resolutions[el.id] === '').length;

  const handleResolve = (id: string, content: string) => {
    setResolutions(prev => ({ ...prev, [id]: content }));
  };

  const generateFinalContent = () => {
    return elements.map(el => {
      if (el.isConflict) {
        return resolutions[el.id] || '';
      }
      return (el as any).content;
    }).join('\n');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(generateFinalContent());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Resolving: <span className="text-blue-400 font-mono text-sm">{filePath}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {unresolvedCount > 0 
              ? `${unresolvedCount} conflicts remaining` 
              : 'All conflicts resolved. Ready to save.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={unresolvedCount > 0 || isSaving}
            className="bg-green-600 hover:bg-green-500 text-white gap-2"
          >
            <Save className="size-4" />
            {isSaving ? 'Saving...' : 'Mark as Resolved'}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <ScrollArea className="flex-1 p-4 bg-gray-950/50">
        <div className="max-w-6xl mx-auto space-y-4">
          {elements.map((el, index) => {
            if (!el.isConflict) {
              return (
                <div key={el.id} className="p-4 bg-gray-900/30 rounded-lg font-mono text-sm text-gray-400 whitespace-pre-wrap border border-gray-800/50">
                  {(el as any).content}
                </div>
              );
            }

            const block = el as ConflictBlock;
            const isResolved = resolutions[block.id] !== '';

            return (
              <Card key={block.id} className={cn(
                "overflow-hidden border transition-colors",
                isResolved ? "border-green-500/30" : "border-amber-500/50"
              )}>
                {/* Block Header */}
                <div className={cn(
                  "p-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center",
                  isResolved ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  <span>Conflict #{index} {isResolved && '(Resolved)'}</span>
                  {!isResolved && <span>Unresolved</span>}
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-800">
                  {/* Current (Left) */}
                  <div className="p-4 bg-blue-950/20">
                    <div className="flex items-center justify-between mb-3 text-xs text-blue-400 font-bold border-b border-blue-900/50 pb-2">
                      <span>Current ({block.currentLabel})</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] hover:bg-blue-900/50 text-blue-400"
                        onClick={() => handleResolve(block.id, block.currentContent)}
                      >
                        Accept Current <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                    <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">{block.currentContent}</pre>
                  </div>

                  {/* Result (Center) */}
                  <div className="p-4 bg-gray-900/50 flex flex-col">
                    <div className="flex items-center justify-between mb-3 text-xs text-gray-300 font-bold border-b border-gray-800 pb-2">
                      <span>Merged Result</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] hover:bg-gray-800"
                        onClick={() => handleResolve(block.id, `${block.currentContent}\n${block.incomingContent}`)}
                      >
                        Accept Both
                      </Button>
                    </div>
                    <textarea 
                      className="flex-1 w-full bg-gray-950 border border-gray-800 rounded-md p-3 font-mono text-sm text-gray-200 outline-none focus:border-blue-500 resize-y min-h-[150px]"
                      value={resolutions[block.id] || ''}
                      onChange={(e) => handleResolve(block.id, e.target.value)}
                      placeholder="Select current/incoming, or edit manually here..."
                    />
                  </div>

                  {/* Incoming (Right) */}
                  <div className="p-4 bg-purple-950/20">
                    <div className="flex items-center justify-between mb-3 text-xs text-purple-400 font-bold border-b border-purple-900/50 pb-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] hover:bg-purple-900/50 text-purple-400"
                        onClick={() => handleResolve(block.id, block.incomingContent)}
                      >
                        <ArrowLeft className="size-3 mr-1" /> Accept Incoming
                      </Button>
                      <span>Incoming ({block.incomingLabel})</span>
                    </div>
                    <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">{block.incomingContent}</pre>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
