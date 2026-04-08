import { useState } from "react";
import { DatasetTabs } from "../components/DatasetTabs";
import { TechniqueDetail } from "../components/TechniqueDetail";
import { TechniqueGraphPanel } from "../components/TechniqueGraphPanel.tsx";
import { TechniqueList } from "../components/TechniqueList";
import { useLoadDatasets } from "../hooks/useLoadDatasets";
import { useAttackStore } from "../store/attack-store";

const CONSENT_STORAGE_KEY = "attackExplorerLargeDownloadAccepted";

function getInitialLargeDownloadConsent() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
}

export default function App() {
  const setCurrentDataset = useAttackStore((s) => s.setCurrentDataset);

  const [hasAcceptedLargeDownload, setHasAcceptedLargeDownload] = useState(
    getInitialLargeDownloadConsent,
  );

  useLoadDatasets(hasAcceptedLargeDownload);

  function handleContinue() {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    setHasAcceptedLargeDownload(true);
    setCurrentDataset("enterprise");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Attack Explorer</h1>
          <p className="subtitle">
            Explore MITRE ATT&CK across Enterprise, Mobile, and ICS datasets ･{" "}
            <a
              href="https://github.com/mitre-attack/attack-stix-data"
              target="_blank"
              rel="noreferrer"
            >
              Source: MITRE ATT&CK STIX Data
            </a>{" "}
            ･{" "}
            <a
              href="https://github.com/notegridx/attack-explorer"
              target="_blank"
              rel="noreferrer"
              className="subtle-link"
            >
              View this project on GitHub
            </a>
          </p>
        </div>
        <DatasetTabs />
      </header>

      <div className="dataset-download-notice" role="note">
        Initial load downloads approximately 50MB of data. Wi-Fi is recommended,
        especially on mobile networks.
      </div>

      <main className="main-grid three-pane-layout">
        <TechniqueList />
        <TechniqueDetail />
        <TechniqueGraphPanel />
      </main>

      {!hasAcceptedLargeDownload && (
        <div className="consent-modal-backdrop">
          <div
            className="consent-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="large-download-title"
            aria-describedby="large-download-description"
          >
            <h2 id="large-download-title">Large download notice</h2>

            <p id="large-download-description">
              Attack Explorer downloads approximately 50MB of MITRE ATT&amp;CK
              data on first load.
            </p>

            <p>
              Using a mobile network may consume significant data. Wi-Fi is
              strongly recommended.
            </p>

            <div className="consent-modal-actions">
              <button
                type="button"
                className="consent-primary-button"
                onClick={handleContinue}
              >
                Continue (download ~50MB)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
