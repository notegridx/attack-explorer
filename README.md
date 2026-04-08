# Attack Explorer

An interactive viewer for the MITRE ATT&CK framework.

Attack Explorer is a React-based single-page application (SPA) designed to make MITRE ATT&CK easier to explore, navigate, and understand — without changing the original data.

---

## 🔍 Overview

MITRE ATT&CK is an incredibly valuable knowledge base for understanding adversary behavior.  
However, its comprehensiveness can make it difficult to browse and explore.

Attack Explorer focuses on improving usability and discoverability by providing:

- Structured navigation by tactic and technique
- Drill-down exploration of relationships (techniques, malware, groups, etc.)
- Visual relationship exploration (tree / graph)
- Clean, minimal UI optimized for fast browsing
- Direct use of official STIX datasets (no data modification)

---

## 🌐 Live Demo

https://attack.notegridx.dev

> ⚠️ Initial load downloads ~50MB of data  
> Wi-Fi is strongly recommended  
> PC / tablet is recommended due to the volume of information

---

## 🧭 UI Overview

Attack Explorer uses a **three-pane layout**:

- **Left pane**: Technique list (by tactic)
- **Center pane**: Technique / object detail
- **Right pane**: Relationship visualization (tree / graph)

This enables seamless navigation between techniques, malware, groups, and other ATT&CK objects.

---

## 🚀 Features

- Explore ATT&CK datasets:
  - Enterprise
  - Mobile
  - ICS
- Technique hierarchy (techniques / sub-techniques)
- Relationship exploration:
  - Incoming / outgoing relationships
  - Grouped by relationship type
- Relationship Tree UI
- Graph-based visualization panel
- Breadcrumb navigation for deep exploration
- Inline citation linking (no separate reference section)
- Dataset switching with loading state indication
- Large dataset download consent modal (~50MB)
- Info panel with source + GitHub links
- Responsive UI (mobile supported, desktop recommended)

---

## 📦 Data Source

This project uses the official MITRE ATT&CK STIX dataset:

- Enterprise ATT&CK  
- Mobile ATT&CK  
- ICS ATT&CK  

Source repository:  
https://github.com/mitre-attack/attack-stix-data

Data is not altered — this project focuses purely on improving the browsing experience.

---

## 🛠 Architecture

### Frontend

- React (SPA)
- TypeScript
- Vite

### State Management

- Centralized store (`attack-store`)
- Dataset switching + load state tracking

### Data Loading

- JSON datasets fetched from Cloudflare R2
- Lazy loading triggered after user consent
- ~50MB initial download handled explicitly via modal

### Hosting

- Cloudflare Pages (frontend)
- Cloudflare R2 (dataset hosting)

---

## 🏗 Local Development

```bash
git clone https://github.com/notegridx/attack-explorer
cd attack-explorer

npm install
npm run dev
```

Then open:

```
http://localhost:5173
```

---

## 📁 Project Structure (simplified)

```
src/
  app/
  components/
  hooks/
  store/
  lib/
```

---

## 🎯 Design Philosophy

This project does **not** attempt to replace MITRE ATT&CK.

Instead, it aims to:

> Shift ATT&CK from something you “look up”  
> to something you can “interactively explore”

Key principles:

- Preserve original data fidelity
- Improve UX without abstraction loss
- Enable intuitive exploration of relationships
- Minimize cognitive load when navigating large datasets

---

## ⚠️ Notes

- Fully client-side SPA
- Large dataset (~50MB) is downloaded on first load
- Performance depends on browser and device
- Mobile is supported, but desktop experience is recommended

---

## 📄 License

MIT License

---

## 🙌 Acknowledgements

- MITRE ATT&CK
- Official STIX data repository

---

## 👤 Author

notegridx

---

## 📌 Future Improvements

- Incremental / streaming data loading
- Advanced filtering & search
- Graph interaction improvements
- Performance optimization for large datasets
- Bookmarking / session persistence
