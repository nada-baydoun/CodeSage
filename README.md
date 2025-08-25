<div align="center">

# CodeSage

AI‑assisted competitive programming platform with a modern Next.js stack, Monaco Editor, and in‑browser Python via Pyodide.

[![CI](https://github.com/nada-baydoun/CodeSage/actions/workflows/ci.yml/badge.svg)](https://github.com/nada-baydoun/CodeSage/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Issues](https://github.com/nada-baydoun/CodeSage/issues) • [Pull Requests](https://github.com/nada-baydoun/CodeSage/pulls)

</div>

## Features

- Problem catalog with filtering by tag, difficulty, and search
- Rich problem pages: difficulty, tags, examples, and constraints
- Monaco Editor (VS Code editor) with Python syntax highlighting
- Run code and sample tests in the browser using Pyodide
- Clean, responsive UI built with Tailwind and shadcn/ui
- TypeScript across the codebase

## Tech Stack

- Framework: Next.js 15 (App Router) with React 19
- Language: TypeScript
- Styling/UI: Tailwind CSS, shadcn/ui, Radix UI
- Editor: Monaco Editor (@monaco-editor/react)
- In‑browser Python: Pyodide

## Quick Start

Prerequisites
- Node.js 18+
- npm 9+

Setup (Windows PowerShell)
```powershell
# Clone
git clone https://github.com/nada-baydoun/CodeSage.git
cd CodeSage

# Install deps
npm install

# Dev server (Turbopack)
npm run dev
# If you hit issues with Turbopack, try:
# npm run dev:legacy
```
Then open http://localhost:3000

Common scripts
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start (prod): `npm start`

## Project Structure

```
public/
  data/
    problemset_complete.json   # Problem metadata (id, name, rating, tags)
    descriptions.json          # Problem statements, examples, notes
src/
  app/
    problems/
      page.tsx                 # Problem set list with filters
      [contestId]/[index]/
        page.tsx               # Dynamic problem page
    layout.tsx                 # Root layout
    globals.css                # Global styles (theme, utilities)
  components/
    ui/                        # Reusable UI components (shadcn)
    ProblemEditor.tsx          # Monaco + runner UI
  lib/
    pyRunner.ts                # Pyodide loader + Python runner utilities
    utils.ts                   # Misc helpers
```

## Data & Notes

- Problem metadata and descriptions are served from `public/data/*` for a fast, static experience.
- Python execution is client‑side via Pyodide and is sandboxed to the browser environment.
- See `src/lib/pyRunner.ts` for how inputs/outputs are normalized and executed.

## Contributing

Contributions are welcome. Please read:
- `CONTRIBUTING.md` for development workflow
- `CODE_OF_CONDUCT.md` for community guidelines

## License

MIT © Nada Baydoun. See `LICENSE` for details.

## Acknowledgements

- Codeforces problem metadata (for tags/ratings inspiration)
- Monaco Editor team
- shadcn/ui and Radix UI
