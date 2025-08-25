<div align="center">

# CodeSage

[![CI](https://github.com/nada-baydoun/CodeSage/actions/workflows/ci.yml/badge.svg)](https://github.com/nada-baydoun/CodeSage/actions/workflows/ci.yml)

An AI‑assisted competitive programming platform built with Next.js, TypeScript, Tailwind, and Monaco Editor.

[Website](https://github.com/nada-baydoun/CodeSage) • [Issues](https://github.com/nada-baydoun/CodeSage/issues) • [Pull Requests](https://github.com/nada-baydoun/CodeSage/pulls)

</div>

## Highlights

- Modern Next.js 15 app router with React 19
- Monaco Editor with Python syntax and client‑side execution via Pyodide
- Clean problem pages with difficulty, tags, examples, and test cases
- Shadcn/Radix UI + Tailwind for a responsive, accessible UI
- TypeScript end‑to‑end

## Tech Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- UI: Tailwind CSS, shadcn/ui, Radix UI
- Editor: Monaco Editor
- Python Runtime (browser): Pyodide

## Quick Start

Prerequisites
- Node.js 18+
- npm 9+

Setup
```powershell
git clone https://github.com/nada-baydoun/CodeSage.git
cd CodeSage
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├─ app/
│  ├─ globals.css        # Global styles
│  ├─ layout.tsx         # Root layout
│  └─ page.tsx           # Landing / home
├─ components/
│  ├─ ui/                # Reusable UI components (shadcn)
│  └─ ProblemEditor.tsx  # Editor with Monaco + problem view
├─ lib/
│  ├─ pyRunner.ts        # Pyodide loader + runner utilities
│  └─ utils.ts
└─ public/
    └─ data/              # Problem metadata and samples
```

## Development

Common scripts
- Start dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start production: `npm start`

Notes
- Pyodide is loaded on demand in the browser (see `src/lib/pyRunner.ts`).
- Problems and descriptions live in `public/data`.

## Contributing

Contributions are welcome! Please see `CONTRIBUTING.md` for guidelines. By participating, you agree to abide by the `CODE_OF_CONDUCT.md`.

## Roadmap

- [ ] Auth and progress tracking
- [ ] Rich hinting and AI assistance
- [ ] Leaderboards and contests
- [ ] More languages (server‑side execution)

## License

MIT © Nada Baydoun. See `LICENSE` for details.
