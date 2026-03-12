import { CommitNodeRaw } from '../../main/services/gitService';

export interface ProcessedCommitNode extends CommitNodeRaw {
  children: string[];
  lane: number;
  row: number;
  branchTags: string[];
}

export interface GraphData {
  nodes: ProcessedCommitNode[];
  maxLanes: number;
}

export function processCommitGraph(rawCommits: CommitNodeRaw[]): GraphData {
  const nodes: ProcessedCommitNode[] = rawCommits.map((c, index) => ({
    ...c,
    children: [],
    lane: -1,
    row: index,
    branchTags: c.refs ? c.refs.split(',').map(r => r.trim()).filter(r => r && !r.startsWith('HEAD ->')) : []
  }));

  const nodeMap = new Map<string, ProcessedCommitNode>();
  nodes.forEach(n => nodeMap.set(n.hash, n));

  // Build children relationships
  nodes.forEach(node => {
    node.parents.forEach(parentId => {
      const parent = nodeMap.get(parentId);
      if (parent) {
        if (!parent.children.includes(node.hash)) {
          parent.children.push(node.hash);
        }
      }
    });
  });

  // Assign lanes
  const activeLanes: (string | null)[] = []; // Array where index is lane, value is branch tip commit hash
  let maxLanes = 0;

  nodes.forEach(node => {
    // 1. Find or assign a lane for the current node
    let lane = activeLanes.findIndex(hash => hash === node.hash);

    if (lane === -1) {
      // Find a free lane
      lane = activeLanes.findIndex(hash => hash === null);
      if (lane === -1) {
        lane = activeLanes.length;
        activeLanes.push(null);
      }
    }

    node.lane = lane;

    // 2. Clear this node from active lanes since we processed it
    activeLanes[lane] = null;

    // 3. Populate lanes for parents
    if (node.parents.length > 0) {
      // First parent stays in the same lane
      const firstParent = node.parents[0];
      if (nodeMap.has(firstParent)) {
         if (activeLanes[lane] === null) {
            activeLanes[lane] = firstParent;
         } else if (activeLanes[lane] !== firstParent) {
            // Lane is taken, meaning another branch merged into this parent earlier. 
            // The parent already has a lane booked. We don't overwrite.
         }
      }

      // Additional parents (merge sources) get new free lanes
      for (let i = 1; i < node.parents.length; i++) {
        const mergeParent = node.parents[i];
        if (nodeMap.has(mergeParent)) {
          // Check if parent is already waiting in another lane
          let existingLane = activeLanes.findIndex(h => h === mergeParent);
          if (existingLane === -1) {
            // Find free lane
            let freeLane = activeLanes.findIndex(hash => hash === null);
            if (freeLane === -1) {
              freeLane = activeLanes.length;
              activeLanes.push(null);
            }
            activeLanes[freeLane] = mergeParent;
          }
        }
      }
    }

    // Determine max lanes used so far
    const currentActiveCount = activeLanes.filter(h => h !== null).length;
    maxLanes = Math.max(maxLanes, activeLanes.length, currentActiveCount);
  });

  return { nodes, maxLanes };
}
