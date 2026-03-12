import React, { useEffect, useRef, useState } from 'react';
import { CommitNodeRaw } from '../../main/services/gitService';
import { processCommitGraph, ProcessedCommitNode, GraphData } from '../lib/graphEngine';

interface CommitGraphViewProps {
  commits: CommitNodeRaw[];
  onCommitSelect: (commit: ProcessedCommitNode) => void;
  selectedHash?: string;
  onContextMenu: (e: React.MouseEvent, commit: ProcessedCommitNode) => void;
}

const ROW_HEIGHT = 40;
const COL_WIDTH = 25;
const NODE_RADIUS = 6;
const PADDING_TOP = 20;

const COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

const CommitGraphView: React.FC<CommitGraphViewProps> = ({ commits, onCommitSelect, selectedHash, onContextMenu }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commits.length > 0) {
      const data = processCommitGraph(commits);
      setGraphData(data);
      
      // Auto-select first commit if none selected
      if (!selectedHash && data.nodes.length > 0) {
        onCommitSelect(data.nodes[0]);
      }
    }
  }, [commits]);

  if (!graphData) return <div className="p-8 text-center text-gray-500">Processing Graph...</div>;

  const width = Math.max(800, graphData.maxLanes * COL_WIDTH + 600);
  const height = graphData.nodes.length * ROW_HEIGHT + PADDING_TOP * 2;

  // Helper to draw bezier curves between rows
  const drawLine = (fromNode: ProcessedCommitNode, toNode: ProcessedCommitNode, isMerge: boolean) => {
    const startX = fromNode.lane * COL_WIDTH + COL_WIDTH;
    const startY = fromNode.row * ROW_HEIGHT + PADDING_TOP;
    
    const endX = toNode.lane * COL_WIDTH + COL_WIDTH;
    const endY = toNode.row * ROW_HEIGHT + PADDING_TOP;

    if (startX === endX) {
      // Straight line down
      return <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={COLORS[fromNode.lane % COLORS.length]} strokeWidth="2" fill="none" />;
    }

    // Curved line for branching or merging
    // A standard curve drawing from start to end with some control points
    const controlY1 = startY + ROW_HEIGHT / 2;
    const controlY2 = endY - ROW_HEIGHT / 2;
    
    // Choose color based on the child (fromNode) if branching, or parent (toNode) if merging
    // In git log, fromNode is the child (newer commit), toNode is the parent (older commit)
    const color = COLORS[(isMerge ? toNode.lane : fromNode.lane) % COLORS.length];

    const path = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
    return <path d={path} stroke={color} strokeWidth="2" fill="none" opacity={isMerge ? 0.6 : 1} />;
  };

  return (
    <div 
      className="w-full h-full overflow-y-auto overflow-x-hidden relative bg-gray-950 no-scrollbar"
      ref={containerRef}
    >
      <svg 
        width="100%" 
        height={height} 
        style={{ minWidth: width }}
        className="absolute top-0 left-0"
      >
        {/* Draw Lines First (Z-index bottom) */}
        {graphData.nodes.map(node => (
          <g key={`lines-${node.hash}`}>
            {node.parents.map((parentId, idx) => {
              const parent = graphData.nodes.find(n => n.hash === parentId);
              if (!parent) return null;
              const isMerge = idx > 0;
              return <React.Fragment key={`${node.hash}-${parentId}`}>{drawLine(node, parent, isMerge)}</React.Fragment>;
            })}
          </g>
        ))}

        {/* Draw Nodes (Z-index top) */}
        {graphData.nodes.map(node => {
          const cx = node.lane * COL_WIDTH + COL_WIDTH;
          const cy = node.row * ROW_HEIGHT + PADDING_TOP;
          const color = COLORS[node.lane % COLORS.length];
          const isSelected = selectedHash === node.hash;

          return (
            <g 
              key={`node-${node.hash}`}
              className="cursor-pointer group"
              onClick={() => onCommitSelect(node)}
              onContextMenu={(e) => onContextMenu(e, node)}
            >
              <rect x={0} y={cy - ROW_HEIGHT/2} width="100%" height={ROW_HEIGHT} fill={isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'} className="group-hover:fill-gray-900/50 transition-colors" />
              
              <circle 
                cx={cx} 
                cy={cy} 
                r={isSelected ? NODE_RADIUS + 2 : NODE_RADIUS} 
                fill={color} 
                stroke={isSelected ? '#fff' : '#111827'}
                strokeWidth="2"
              />
              
              {/* Ref Tags */}
              <text x={graphData.maxLanes * COL_WIDTH + 50} y={cy + 4} fill="#9ca3af" fontSize="12" fontFamily="monospace" className="pointer-events-none">
                {node.message}
              </text>

              <text x={graphData.maxLanes * COL_WIDTH + 600} y={cy + 4} fill="#6b7280" fontSize="10" fontFamily="monospace" textAnchor="end" className="pointer-events-none">
                {node.author} • {new Date(node.date).toLocaleDateString()}
              </text>

              <text x={cx + 15} y={cy + 3} fill="#4b5563" fontSize="10" fontFamily="monospace" className="pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                {node.hash.substring(0,7)}
              </text>

              {node.branchTags.map((tag, i) => {
                 const isHead = tag === 'HEAD';
                 const isRemote = tag.includes('/');
                 let tagColor = '#3f3f46'; // gray
                 let textColor = '#e4e4e7';
                 if (isHead) { tagColor = '#3b82f6'; textColor = '#fff'; }
                 else if (isRemote) { tagColor = '#713f12'; textColor = '#fef08a'; } // amber
                 else { tagColor = '#14532d'; textColor = '#86efac'; } // green

                 return (
                   <g key={`tag-${tag}-${i}`} transform={`translate(${graphData.maxLanes * COL_WIDTH - 200 + i * 80}, ${cy - 8})`}>
                     <rect width={10 + tag.length * 6} height="16" rx="4" fill={tagColor} />
                     <text x="5" y="11" fill={textColor} fontSize="9" fontFamily="monospace" fontWeight="bold">
                       {tag.length > 12 ? tag.substring(0, 10) + '..' : tag}
                     </text>
                   </g>
                 )
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CommitGraphView;
