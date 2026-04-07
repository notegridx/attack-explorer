import { DatasetTabs } from "../components/DatasetTabs";
import { TechniqueDetail } from "../components/TechniqueDetail";
import { TechniqueList } from "../components/TechniqueList";
import { useLoadDatasets } from "../hooks/useLoadDatasets";

export default function App() {
  useLoadDatasets();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Attack Explorer</h1>
          <p className="subtitle">
            Explore MITRE ATT&CK across Enterprise, Mobile, and ICS datasets.
          </p>
        </div>
        <DatasetTabs />
      </header>

      <main className="main-grid">
        <TechniqueList />
        <TechniqueDetail />
      </main>
    </div>
  );
}
