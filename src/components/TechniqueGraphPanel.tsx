import { useAttackStore } from "../store/attack-store";
import { RelationshipGraph } from "./RelationshipGraph";

export function TechniqueGraphPanel() {
  const dataset = useAttackStore((s) => s.getCurrentDataset());
  const currentDataset = useAttackStore((s) => s.currentDataset);
  const selectedTechnique = useAttackStore((s) => s.getSelectedTechnique());
  const currentDetailObject = useAttackStore((s) => s.getCurrentDetailObject());
  const setCurrentDetailObjectId = useAttackStore(
    (s) => s.setCurrentDetailObjectId,
  );

  if (!dataset) {
    return <div className="panel graph-panel">Loading...</div>;
  }

  if (!selectedTechnique) {
    return <div className="panel graph-panel">No technique selected.</div>;
  }

  const centerObject = currentDetailObject ?? selectedTechnique;

  function openGraphObject(objectId: string) {
    setCurrentDetailObjectId(currentDataset, objectId);
  }

  return (
    <div className="panel graph-panel">
      <div className="graph-panel-header">
        <div className="graph-panel-label">Graph focus</div>
        <div className="graph-panel-name">
          {centerObject.name ?? centerObject.id}
        </div>
      </div>

      <RelationshipGraph
        dataset={dataset}
        centerObjectId={centerObject.id}
        activeObjectId={centerObject.id}
        onOpenObject={openGraphObject}
      />
    </div>
  );
}
