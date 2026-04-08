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
- Clean, minimal UI optimized for fast browsing
- Direct use of official STIX datasets (no data modification)

---

## 🌐 Live Demo

https://attack.notegridx.dev

> ⚠️ Initial load downloads ~50MB of data
> Wi-Fi connection is recommended
> PC / tablet is recommended due to the volume of information

---

## 📦 Data Source

This project uses the official MITRE ATT&CK STIX dataset:

- Enterprise ATT&CK
- Mobile ATT&CK
- ICS ATT&CK

Data is not altered — the application focuses purely on improving the browsing experience.

---

## 🚀 Features

- Explore ATT&CK datasets (Enterprise / Mobile / ICS)
- View techniques and sub-techniques in a hierarchical structure
- Navigate relationships (malware, intrusion sets, tools, mitigations)
- Inline citation linking for references
- Breadcrumb-based navigation for deep exploration
- Responsive UI (mobile supported, but desktop recommended)

---

## 🛠 Tech Stack

- React
- TypeScript
- Vite
- Static hosting (Cloudflare Pages)
- Data hosted on Cloudflare R2

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

---

## ⚠️ Notes

- This is a client-side SPA
- Large dataset (~50MB) is loaded on initial access
- Performance depends on browser and device

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

## 📌 Future Improvements (optional)

- Incremental data loading
- Advanced filtering / search
- Graph-based relationship visualization
- Bookmarking / session persistence
