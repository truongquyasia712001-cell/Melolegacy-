# Melo Legacy — Music Notes Room

## PDF Workspace (Phase 1)
- Responsive React + TypeScript + Vite workspace.
- Opens local PDF files in-browser using PDF.js.
- Page navigation and zoom controls.
- Recognition workflow panel clearly indicates that OMR is not yet connected.
- Notes panel for the current working session.

## Run locally
```bash
cd melolegacy
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Next engineering milestone
Integrate and validate an Optical Music Recognition (OMR) engine. Do not present placeholder output as recognized notation. The pipeline must retain source-page references, confidence values, review/edit states, and MusicXML export validation.
