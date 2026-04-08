import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { getExternalId } from "../lib/attack-parser";
import type { ParsedDataset } from "../types/attack";

type RelationshipGraphProps = {
  dataset: ParsedDataset;
  centerObjectId: string;
  activeObjectId?: string;
  onOpenObject: (objectId: string) => void;
};

type GraphNodeData = {
  label: string;
  typeLabel: string;
  externalId?: string;
  isCenter: boolean;
  isActive: boolean;
  onOpenObject: (objectId: string) => void;
};

function GraphObjectNode({ id, data }: NodeProps<GraphNodeData>) {
  const className = [
    "attack-graph-node",
    data.isCenter ? "center" : "",
    data.isActive ? "active" : "",
    `type-${data.typeLabel.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={() => data.onOpenObject(id)}
      title={
        data.externalId ? `${data.externalId} · ${data.label}` : data.label
      }
    >
      <div className="attack-graph-node-top">
        <span className="attack-graph-node-type">{data.typeLabel}</span>
        {data.externalId && (
          <span className="attack-graph-node-id">{data.externalId}</span>
        )}
      </div>
      <div className="attack-graph-node-label">{data.label}</div>
    </button>
  );
}

const nodeTypes = {
  objectNode: GraphObjectNode,
};

function buildGraph(
  dataset: ParsedDataset,
  centerObjectId: string,
  activeObjectId: string | undefined,
  onOpenObject: (objectId: string) => void,
): { nodes: Node<GraphNodeData>[]; edges: Edge[]; hiddenCount: number } {
  const centerObject = dataset.objectsById[centerObjectId];
  if (!centerObject) {
    return { nodes: [], edges: [], hiddenCount: 0 };
  }

  const nodeMap = new Map<string, Node<GraphNodeData>>();
  const edgeMap = new Map<string, Edge>();

  const addNode = (
    objectId: string,
    position: { x: number; y: number },
    overrides?: Partial<GraphNodeData>,
  ) => {
    const obj = dataset.objectsById[objectId];
    if (!obj) return;

    const existing = nodeMap.get(objectId);
    const nextData: GraphNodeData = {
      label: obj.name ?? obj.id,
      typeLabel: obj.type,
      externalId: getExternalId(obj),
      isCenter: objectId === centerObjectId,
      isActive: objectId === activeObjectId,
      onOpenObject,
      ...overrides,
    };

    if (existing) {
      nodeMap.set(objectId, {
        ...existing,
        data: nextData,
      });
      return;
    }

    nodeMap.set(objectId, {
      id: objectId,
      type: "objectNode",
      position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: nextData,
      draggable: false,
    });
  };

  const addEdge = (
    edgeId: string,
    source: string,
    target: string,
    direction: "outgoing" | "incoming",
  ) => {
    if (edgeMap.has(edgeId)) return;

    edgeMap.set(edgeId, {
      id: edgeId,
      source,
      target,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      animated: false,
      className:
        direction === "outgoing"
          ? "attack-graph-edge outgoing"
          : "attack-graph-edge incoming",
    });
  };

  const outgoing = dataset.relationshipsBySource[centerObjectId] ?? [];
  const incoming = dataset.relationshipsByTarget[centerObjectId] ?? [];

  const uniqueOutgoingTargetIds = Array.from(
    new Set(
      outgoing
        .map((rel) => rel.target_ref)
        .filter(
          (id) => id !== centerObjectId && Boolean(dataset.objectsById[id]),
        ),
    ),
  );

  const uniqueIncomingSourceIds = Array.from(
    new Set(
      incoming
        .map((rel) => rel.source_ref)
        .filter(
          (id) => id !== centerObjectId && Boolean(dataset.objectsById[id]),
        ),
    ),
  );

  const MAX_OUTGOING = 6;
  const MAX_INCOMING = 6;

  const visibleOutgoingTargetIds = uniqueOutgoingTargetIds.slice(
    0,
    MAX_OUTGOING,
  );
  const visibleIncomingSourceIds = uniqueIncomingSourceIds.slice(
    0,
    MAX_INCOMING,
  );

  const hiddenCount =
    Math.max(
      uniqueOutgoingTargetIds.length - visibleOutgoingTargetIds.length,
      0,
    ) +
    Math.max(
      uniqueIncomingSourceIds.length - visibleIncomingSourceIds.length,
      0,
    );

  const visibleOutgoingSet = new Set(visibleOutgoingTargetIds);
  const visibleIncomingSet = new Set(visibleIncomingSourceIds);

  const verticalSpacing = 90;
  const leftX = -280;
  const rightX = 280;
  const centerY = 80;

  addNode(centerObjectId, { x: 0, y: centerY }, { isCenter: true });

  visibleIncomingSourceIds.forEach((objectId, index) => {
    const offset =
      (index - (visibleIncomingSourceIds.length - 1) / 2) * verticalSpacing;

    addNode(objectId, { x: leftX, y: centerY + offset });
  });

  visibleOutgoingTargetIds.forEach((objectId, index) => {
    const offset =
      (index - (visibleOutgoingTargetIds.length - 1) / 2) * verticalSpacing;

    addNode(objectId, { x: rightX, y: centerY + offset });
  });

  outgoing.forEach((rel) => {
    if (!visibleOutgoingSet.has(rel.target_ref)) return;
    if (!dataset.objectsById[rel.target_ref]) return;

    addEdge(rel.id, rel.source_ref, rel.target_ref, "outgoing");
  });

  incoming.forEach((rel) => {
    if (!visibleIncomingSet.has(rel.source_ref)) return;
    if (!dataset.objectsById[rel.source_ref]) return;

    addEdge(rel.id, rel.source_ref, rel.target_ref, "incoming");
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    hiddenCount,
  };
}

export function RelationshipGraph({
  dataset,
  centerObjectId,
  activeObjectId,
  onOpenObject,
}: RelationshipGraphProps) {
  const { nodes, edges, hiddenCount } = useMemo(
    () => buildGraph(dataset, centerObjectId, activeObjectId, onOpenObject),
    [dataset, centerObjectId, activeObjectId, onOpenObject],
  );

  if (nodes.length <= 1) {
    return null;
  }

  return (
    <section className="related-section">
      <div className="related-section-header">
        <h3>Relationship graph</h3>
        <span className="related-section-count">{nodes.length - 1}</span>
      </div>

      {hiddenCount > 0 && (
        <div className="attack-graph-note">
          Showing the first {nodes.length - 1} related objects in the graph.{" "}
          {hiddenCount} more are available in the relationship lists below.
        </div>
      )}

      <div className="attack-graph-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.75 }}
          minZoom={0.6}
          maxZoom={1.8}
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={false} />
          <Background />
        </ReactFlow>
      </div>
    </section>
  );
}
