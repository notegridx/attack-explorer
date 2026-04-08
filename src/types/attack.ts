export type DatasetKey = "enterprise" | "mobile" | "ics";

export type ExternalReference = {
  source_name?: string;
  external_id?: string;
  url?: string;
  description?: string;
};

export type KillChainPhase = {
  kill_chain_name?: string;
  phase_name?: string;
};

export type StixObject = {
  id: string;
  type: string;
  name?: string;
  description?: string;
  revoked?: boolean;
  x_mitre_deprecated?: boolean;
  external_references?: ExternalReference[];
  kill_chain_phases?: KillChainPhase[];
  x_mitre_platforms?: string[];
  x_mitre_domains?: string[];
  x_mitre_version?: string;
  [key: string]: unknown;
};

export type Relationship = StixObject & {
  type: "relationship";
  relationship_type: string;
  source_ref: string;
  target_ref: string;
};

export type ParsedDataset = {
  key: DatasetKey;
  label: string;
  version?: string;
  objects: StixObject[];
  objectsById: Record<string, StixObject>;
  relationships: Relationship[];
  relationshipsBySource: Record<string, Relationship[]>;
  relationshipsByTarget: Record<string, Relationship[]>;
  techniques: StixObject[];
};