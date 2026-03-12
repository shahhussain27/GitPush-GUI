import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { 
  Activity, 
  Database, 
  FileBox, 
  AlertTriangle, 
  CheckCircle,
  FileDigit,
  Wand2,
  Trash2,
  HardDrive
} from 'lucide-react';
import { cn } from '../lib/utils';

interface HealthAnalyzerTabProps {
  currentPath: string | null;
  analyzeHealth: () => Promise<{ size: string, largestFiles: { path: string, size: number }[] }>;
}

export default function HealthAnalyzerTab({ currentPath, analyzeHealth }: HealthAnalyzerTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [healthData, setHealthData] = useState<{ size: string, largestFiles: { path: string, size: number }[] } | null>(null);

  useEffect(() => {
    if (currentPath) {
      runAnalysis();
    }
  }, [currentPath]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const data = await analyzeHealth();
      setHealthData(data);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Basic Heuristic Scoring (0-100)
  const calculateScore = () => {
    if (!healthData) return 100;
    let score = 100;

    // Penalty for overall repo size > 500MB
    const sizeMB = parseFloat(healthData.size.replace(' MB', ''));
    if (sizeMB > 1000) score -= 30;
    else if (sizeMB > 500) score -= 15;
    else if (sizeMB > 200) score -= 5;

    // Penalty for having very large individual files (>50MB)
    const giantFiles = healthData.largestFiles.filter(f => f.size > 50 * 1024 * 1024);
    score -= (giantFiles.length * 5);

    // Keep score bounded
    return Math.max(0, Math.min(100, score));
  };

  const score = calculateScore();

  // Status Colors
  let statusColor = "text-green-500";
  let bgGradient = "from-green-500/20";
  if (score < 50) {
    statusColor = "text-red-500";
    bgGradient = "from-red-500/20";
  } else if (score < 80) {
    statusColor = "text-amber-500";
    bgGradient = "from-amber-500/20";
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="absolute inset-0 size-16 border-t-2 border-blue-500 rounded-full animate-spin"></div>
          <Activity className="size-8 text-blue-500 m-4 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-200">Analyzing Repository Health...</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          Scanning objects, calculating sizes, and identifying structural issues.
        </p>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full animate-in fade-in duration-500">
        <Activity className="size-16 text-gray-700 mb-4" />
        <h3 className="text-xl font-bold text-gray-400">Analysis Data Unavailable</h3>
      </div>
    );
  }

  const giantFilesCount = healthData.largestFiles.filter(f => f.size > 10 * 1024 * 1024).length; // Files > 10MB

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Banner - Health Score */}
      <div className={cn("relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 p-8", `bg-gradient-to-r ${bgGradient} to-gray-950`)}>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className={cn("size-6", statusColor)} />
              <h2 className="text-2xl font-bold text-white">Repository Health</h2>
            </div>
            <p className="text-gray-400 max-w-lg">
              {score >= 80 ? "Your repository structure is excellent." : 
               score >= 50 ? "Your repository is healthy but has some areas for improvement." : 
               "Your repository requires cleanup to prevent performance degradation."}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total Size</div>
              <div className="text-3xl font-mono text-gray-200">{healthData.size}</div>
            </div>
            
            <div className="h-16 w-px bg-gray-800"></div>
            
            <div className="text-center relative">
              <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Health Score</div>
              <div className={cn("text-5xl font-black", statusColor)}>
                {score}<span className="text-2xl opacity-50">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column - Diagnostics */}
        <div className="col-span-1 flex flex-col gap-6">
          <Card className="bg-gray-950 border-gray-800 flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-gray-800/50">
              <CardTitle className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Detected Issues
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="pt-4 space-y-4 text-sm">
                
                {giantFilesCount > 0 ? (
                  <div className="flex items-start gap-3 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <Database className="size-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-500">Large Files Detected</p>
                      <p className="text-xs text-gray-400 mt-1">Found {giantFilesCount} files exceeding 10MB in your history. Consider moving assets to Git LFS to keep fetches fast.</p>
                      <Button variant="outline" size="sm" className="mt-3 text-xs w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/20">
                        <Wand2 className="size-3 mr-2" />
                        Configure Git LFS
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-green-500">File Sizes Optimal</p>
                      <p className="text-xs text-gray-500 mt-1">No large un-tracked binaries found.</p>
                    </div>
                  </div>
                )}

                {parseFloat(healthData.size.replace(' MB', '')) > 500 && (
                  <div className="flex items-start gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <HardDrive className="size-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-red-500">High Repository Imprint</p>
                      <p className="text-xs text-gray-400 mt-1">The local repository structure is heavily bloated (&gt;500MB). Cloning this repository may become slow.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column - Top Files */}
        <div className="col-span-2 flex flex-col">
          <Card className="bg-gray-950 border-gray-800 flex-1 flex flex-col overflow-hidden">
             <CardHeader className="pb-3 border-b border-gray-800">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-bold text-gray-300 flex items-center gap-2">
                   <FileBox className="size-4 text-blue-500" />
                   Largest Files (Top 20)
                 </CardTitle>
                 <Button onClick={runAnalysis} variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-gray-500 hover:text-white">
                   Rescan
                 </Button>
               </div>
             </CardHeader>
             <ScrollArea className="flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">File Path</th>
                      <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider w-32 text-right">Size</th>
                      <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider w-24">Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {healthData.largestFiles.map((file, idx) => {
                      const isGiant = file.size > 10 * 1024 * 1024; // >10MB
                      const colorClass = isGiant ? "text-amber-500 font-bold" : "text-gray-300";
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-900/30 transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <FileDigit className={cn("size-4 opacity-50", colorClass)} />
                              <span className={cn("truncate max-w-[400px]", colorClass)} title={file.path}>
                                {file.path}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-400">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isGiant && (
                              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                LFS Target
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {healthData.largestFiles.length === 0 && (
                       <tr>
                         <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">
                           No file metrics available.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
             </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
