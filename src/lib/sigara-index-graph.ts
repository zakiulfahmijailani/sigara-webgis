import type { PillarId } from './sigara-index-types';
import { DATA_SOURCES, PILLARS, VARIABLE_BLUEPRINTS } from './sigara-index-sources';

export type GraphNodeKind = 'source' | 'variable' | 'pillar' | 'index';

export type SankeyNode = {
  id: string;
  name: string;
  shortLabel: string;
  lines: string[];
  kind: GraphNodeKind;
  column: number; // 0, 1, 2, 3
  color: string;
  sourceId?: string;
  pillarId?: PillarId;
  value: number; // numeric width/weight
  // layout coordinates
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  description?: string;
  statusBadge?: string;
};

export type SankeyLink = {
  id: string;
  sourceId: string;
  targetId: string;
  value: number;
  width: number;
  color: string;
  pillarId: PillarId;
  // Bezier coordinates
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  isContribution: boolean;
};

export type SankeyGraphData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  mode: 'structure' | 'contribution';
  totalIndexScore?: number | null;
  width: number;
  height: number;
};

export function buildSankeyGraph(
  width: number,
  height: number,
  mode: 'structure' | 'contribution' = 'structure',
  pillarContributions?: Record<PillarId, number | null>,
  totalScore?: number | null
): SankeyGraphData {
  const nodeWidth = 8;
  const paddingX = Math.max(16, width * 0.02);
  const leftMargin = 140;
  const rightMargin = 85;
  const usableWidth = Math.max(100, width - leftMargin - rightMargin);

  const colX = [
    leftMargin,
    leftMargin + usableWidth * 0.38,
    leftMargin + usableWidth * 0.72,
    width - rightMargin,
  ];

  const topY = 46;
  const bottomY = height - 20;
  const usableHeight = Math.max(100, bottomY - topY);

  // 1. Column 0: Sources (8 nodes)
  const sourceNodes: SankeyNode[] = DATA_SOURCES.map((s, idx) => {
    return {
      id: s.id,
      name: s.name,
      shortLabel: s.shortLabel,
      lines: s.lines,
      kind: 'source',
      column: 0,
      color: 'var(--sf-source, #264f70)',
      value: VARIABLE_BLUEPRINTS.filter((v) => v.sourceId === s.id).reduce((sum, v) => sum + v.structuralWeight, 0),
      x0: colX[0],
      x1: colX[0] + nodeWidth,
      y0: 0,
      y1: 0,
      description: s.description,
      statusBadge: s.statusBadge,
    };
  });

  // 2. Column 1: Variables (12 nodes)
  const variableNodes: SankeyNode[] = VARIABLE_BLUEPRINTS.map((v) => {
    const p = PILLARS[v.pillarId];
    return {
      id: v.id,
      name: v.name,
      shortLabel: v.name,
      lines: v.lines,
      kind: 'variable',
      column: 1,
      color: p.color,
      sourceId: v.sourceId,
      pillarId: v.pillarId,
      value: v.structuralWeight,
      x0: colX[1],
      x1: colX[1] + nodeWidth,
      y0: 0,
      y1: 0,
      description: v.method,
    };
  });

  // 3. Column 2: Pillars (4 nodes)
  const pillarOrder: PillarId[] = ['services', 'patterns', 'geoai', 'access'];
  const pillarNodes: SankeyNode[] = pillarOrder.map((pid) => {
    const p = PILLARS[pid];
    const contrib = pillarContributions ? pillarContributions[pid] : null;
    const isContribValid = mode === 'contribution' && contrib !== null && contrib !== undefined && Number.isFinite(contrib);
    const value = isContribValid
      ? Math.max(contrib, 1)
      : VARIABLE_BLUEPRINTS.filter((v) => v.pillarId === pid).reduce((sum, v) => sum + v.structuralWeight, 0);

    return {
      id: pid,
      name: p.name,
      shortLabel: p.shortName,
      lines: [p.shortName],
      kind: 'pillar',
      column: 2,
      color: p.color,
      pillarId: pid,
      value,
      x0: colX[2],
      x1: colX[2] + nodeWidth,
      y0: 0,
      y1: 0,
      description: p.description,
    };
  });

  // 4. Column 3: SIGARA Index (1 node)
  const indexValue = mode === 'contribution' && totalScore != null ? Math.max(totalScore, 2) : 48;
  const indexNode: SankeyNode = {
    id: 'index',
    name: 'SIGARA Index',
    shortLabel: 'SIGARA Index',
    lines: ['SIGARA', 'Index'],
    kind: 'index',
    column: 3,
    color: '#20a897',
    value: indexValue,
    x0: colX[3],
    x1: colX[3] + nodeWidth,
    y0: 0,
    y1: 0,
    description: 'Prioritas penelaahan rujukan terintegrasi dari keempat pilar',
  };

  // Layout helper to distribute nodes in a column evenly
  function layoutColumn(nodes: SankeyNode[], spacing: number) {
    const n = nodes.length;
    if (n === 0) return;
    const totalGap = (n - 1) * spacing;
    const totalVal = nodes.reduce((s, node) => s + Math.max(node.value, 1), 0);
    const availableForNodes = Math.max(n * 8, usableHeight - totalGap);

    let currY = topY;
    nodes.forEach((node) => {
      const h = Math.max(6, Math.min(60, (Math.max(node.value, 1) / totalVal) * availableForNodes));
      node.y0 = currY;
      node.y1 = currY + h;
      currY += h + spacing;
    });
  }

  layoutColumn(sourceNodes, (usableHeight - 8 * 24) / 8);
  layoutColumn(variableNodes, (usableHeight - 12 * 18) / 12);
  layoutColumn(pillarNodes, (usableHeight - 4 * 48) / 4);

  // Position Index Node in the middle
  const idxH = Math.max(20, Math.min(100, (indexValue / 100) * (usableHeight * 0.4)));
  const idxMid = (topY + bottomY) / 2;
  indexNode.y0 = idxMid - idxH / 2;
  indexNode.y1 = idxMid + idxH / 2;

  const allNodes = [...sourceNodes, ...variableNodes, ...pillarNodes, indexNode];
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // Build Links
  const links: SankeyLink[] = [];

  // Links: Source -> Variable
  variableNodes.forEach((v) => {
    const s = nodeMap.get(v.sourceId!);
    if (!s) return;
    const linkVal = v.value;
    const linkWidth = Math.max(1.5, Math.min(12, linkVal * 0.9));
    links.push({
      id: `${s.id}__${v.id}`,
      sourceId: s.id,
      targetId: v.id,
      value: linkVal,
      width: linkWidth,
      color: v.color,
      pillarId: v.pillarId!,
      x0: s.x1,
      y0: (s.y0 + s.y1) / 2,
      x1: v.x0,
      y1: (v.y0 + v.y1) / 2,
      isContribution: false,
    });
  });

  // Links: Variable -> Pillar
  variableNodes.forEach((v) => {
    const p = nodeMap.get(v.pillarId!);
    if (!p) return;
    const linkVal = v.value;
    const linkWidth = Math.max(1.5, Math.min(12, linkVal * 0.9));
    links.push({
      id: `${v.id}__${p.id}`,
      sourceId: v.id,
      targetId: p.id,
      value: linkVal,
      width: linkWidth,
      color: p.color,
      pillarId: v.pillarId!,
      x0: v.x1,
      y0: (v.y0 + v.y1) / 2,
      x1: p.x0,
      y1: (p.y0 + p.y1) / 2,
      isContribution: false,
    });
  });

  // Links: Pillar -> Index
  pillarNodes.forEach((p) => {
    const contrib = pillarContributions ? pillarContributions[p.pillarId!] : null;
    const isContribValid = mode === 'contribution' && contrib !== null && contrib !== undefined;
    const linkVal = isContribValid ? contrib : p.value;
    const linkWidth = isContribValid
      ? Math.max(1.5, Math.min(22, (contrib / 100) * 45))
      : Math.max(2, Math.min(14, linkVal * 0.7));

    links.push({
      id: `${p.id}__index`,
      sourceId: p.id,
      targetId: 'index',
      value: linkVal,
      width: linkWidth,
      color: p.color,
      pillarId: p.pillarId!,
      x0: p.x1,
      y0: (p.y0 + p.y1) / 2,
      x1: indexNode.x0,
      y1: (indexNode.y0 + indexNode.y1) / 2,
      isContribution: isContribValid,
    });
  });

  return {
    nodes: allNodes,
    links,
    mode,
    totalIndexScore: totalScore,
    width,
    height,
  };
}
