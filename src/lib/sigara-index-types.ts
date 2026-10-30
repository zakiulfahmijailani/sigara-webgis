// SIGARA Index — Type definitions for multipillar model and data flow

export type EvidenceOrigin = 'observed' | 'derived' | 'synthetic' | 'reference';
export type Availability = 'available' | 'missing' | 'insufficient' | 'not_applicable';
export type IntegrationStatus = 'loaded' | 'demo_only' | 'planned';
export type PillarId = 'services' | 'patterns' | 'geoai' | 'access';

export type PillarMetadata = {
  id: PillarId;
  name: string;
  shortName: string;
  color: string;
  lightColor: string;
  description: string;
  iconName: string;
};

export type DataSourceMetadata = {
  id: string;
  number: number;
  name: string;
  shortLabel: string;
  lines: string[];
  provider: string;
  description: string;
  integrationStatus: IntegrationStatus;
  statusBadge: string;
  rawSourceUrl?: string;
};

export type IndexVariable = {
  id: string;
  label: string;
  lines: string[];
  sourceId: string;
  sourceName: string;
  pillarId: PillarId;
  value: number | string | null;
  unit: string | null;
  availability: Availability;
  origin: EvidenceOrigin;
  integrationStatus: IntegrationStatus;
  method: string;
  observedAt?: string | null;
  period?: { from: string | null; to: string | null };
  normalizedValue?: number | null; // 0-100 or null
  contributionPoints?: number | null;
  evidenceId?: string | null;
  rawDetails?: string;
};

export type IndexPillar = {
  id: PillarId;
  name: string;
  score: number | null; // 0-100 or null if missing/insufficient
  weight: number; // e.g. 0.25
  contributionPoints: number | null; // score * weight
  availability: Availability;
  statusLabel: string;
  variableIds: string[];
  directionNote: string; // "Semakin tinggi = semakin perlu ditelaah kewajarannya"
};

export type MasterReconstruction = {
  basePoints: number; // 10
  timePoints: number; // 45 * min(excess / 60, 1)
  ratioPoints: number; // 35 * min(max(ratio - 1, 0) / 2, 1)
  rawScore: number;
  continuityDiscountApplied: boolean;
  finalScore: number;
  maxScore: number; // 90 before discount
  roundingTolerance: string;
};

export type EpisodeIndexExplanation = {
  episodeId: string;
  modelVersion: string; // e.g. "v1.0-master" or "v2.0-multipillar-demo"
  mode: 'master' | 'multipillar_demo';
  scenarioId?: string | null;
  score: number | null; // master score or v2 score
  masterScore: number | null;
  category: 'red' | 'orange' | 'green';
  categoryLabel: string;
  sourceSnapshot: string;
  variables: IndexVariable[];
  pillars: IndexPillar[];
  masterReconstruction?: MasterReconstruction;
  graphMode: 'structure' | 'contribution';
  statusNote: string;
  isSimulatedDemo: boolean;
};

export type ModelPillarWeights = Record<PillarId, number>;
