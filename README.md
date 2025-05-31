# Patient Registration App (Frontend-only + PGlite + React)

A lightweight, browser-only patient-registration system:

* **Register patients** with full profile, medical history & emergency contact  
* **Run raw SQL** queries in an embedded Monaco editor  
* **Offline-first** — data is stored in IndexedDB via [PGlite](https://electric-sql.com/docs/pglite)  
* **Multi-tab sync** — BroadcastChannel + localStorage polling keep every tab in lock-step  
* **Dark / light mode** toggle, MUI 5 components, and nice DataGrid UX

---

## Demo

> **[Live Demo](https://your-app-url.netlify.app)** — Replace with your deployment URL

---

## Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | 18+ |
| **npm** (or `pnpm`) | 9+ |
| Modern browser | Chromium / Firefox / Safari with SharedArrayBuffer support |

No server, database, or Docker setup is required.  
The first load (≈ 15 MB) fetches the `pglite.wasm` + `pglite.data` bundle.

---

## Local Development

```bash
git clone https://github.com/akanksha509/patient-registration-app.git
cd patient-registration-app
npm install          # or pnpm install
npm run dev          # Vite dev-server at http://localhost:5173
```

The database is initialized on first page load and migrations run automatically.


## Build & Preview
```bash
npm run build        # creates /dist
npm run preview      # serves the static build (Vite preview)
```

The production build is suitable for Netlify, Vercel, GitHub Pages, or any static host that can serve `.wasm` and `.data` files.

---

## Project Structure

```
PATIENT-APP/
├── public/
│   ├── logo.png         # App icon
│   ├── pglite.data      # ~5 MB PGlite data bundle
│   ├── pglite.wasm      # ~8 MB PGlite WASM bundle
│   └── vite.svg         # Vite logo
├── src/
│   ├── assets/          # Static assets
│   │   └── react.svg    # React logo
│   ├── components/      # Reusable UI components
│   │   ├── ErrorBoundary.jsx    # Error handling wrapper
│   │   ├── PatientForm.jsx      # Patient registration form
│   │   ├── ResultsTable.jsx     # Data display table
│   │   ├── SqlEditor.jsx        # Monaco SQL editor
│   │   └── SyncManager.jsx      # Multi-tab synchronization
│   ├── contexts/        # React contexts
│   │   ├── ColorModeContext.jsx # Theme switching context
│   │   └── DatabaseContext.jsx  # PGlite database context
│   ├── db/              # Database layer
│   │   ├── index.js            # Database utilities
│   │   ├── migrations.js       # Schema migrations
│   │   └── pglite.worker.js    # Web Worker for DB operations
│   ├── pages/           # Route components
│   │   ├── QueryPage.jsx       # SQL query interface
│   │   └── RegisterPage.jsx    # Patient registration page
│   ├── App.jsx          # Main app component & routing
│   ├── main.jsx         # React app entry point
│   └── theme.js         # MUI theme configuration
├── .gitignore           # Git ignore rules
├── eslint.config.js     # ESLint configuration
├── index.html           # HTML entry point
├── package-lock.json    # Dependency lock file
├── package.json         # Project dependencies & scripts
├── README.md            # Project documentation
└── vite.config.js       # Vite build configuration
```

---

## Tech Stack & Decisions

| Topic | Choice | Why |
|-------|--------|-----|
| **Embedded DB** | PGlite (SQLite in WASM) | Full SQL support, zero backend, easy migrations |
| **Schema Migration** | Custom SQL in migrations.js | Runs automatically before first query |
| **Multi-tab Sync** | BroadcastChannel + localStorage polling | Works across all modern browsers |
| **UI Library** | Material-UI v5 | Fast theming, DataGrid, consistent accessibility |
| **Code Editor** | Monaco Editor | SQL syntax highlighting & shortcuts (Ctrl/⌘-Enter) |
| **State Validation** | Zod + custom helpers | Declarative rules, reused in tests |
| **Styling** | MUI sx prop | Keeps bundle small, leverages theme system |
| **Build Tool** | Vite | Fast development, optimized production builds |

---

## Features

### Patient Registration
- Complete patient profiles with medical history
- Emergency contact information
- Client-side validation with inline errors
- Duplicate email / phone protection (UNIQUE indices)

### SQL Query Interface
- Monaco editor with syntax highlighting
- Execute custom SQL queries
- View results in formatted table
- Real-time query execution

### Multi-tab Synchronization
- Real-time data sync across browser tabs
- Visual sync status indicator
- Simple last-write-wins sync strategy

### UI/UX
- Dark/light mode toggle
- Responsive design for all screen sizes
- Material Design components
- Accessible form controls

---

## Known Limitations

- **Browser-local only** — patients stored in IndexedDB; no remote persistence
- **Large initial download** — PGlite WASM bundle ≈ 15 MB (cached after first load)
- **Polling sync** — 3-second intervals for older browser compatibility

---

## Future Enhancements

- Service Worker for background sync & PWA capabilities
- CSV import/export for bulk patient data
- Role-based authentication (admin vs read-only)
- Advanced search and filtering
- Data backup/restore functionality
- Cypress E2E test suite

---

## Development Challenges

- **WASM in Vite** — Ensuring .wasm/.data files are properly handled in build
- **BroadcastChannel quirks** — iOS Safari compatibility required polling fallback
- **Country code API** — Implemented local fallback for offline functionality

---
