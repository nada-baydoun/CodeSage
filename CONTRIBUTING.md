# Contributing to CodeSage

Thanks for your interest in contributing! This document explains how to propose changes.

## Development Setup

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`

## Branching

- Create a feature branch from `main`: `feat/short-description` or `fix/short-description`

## Commit Messages

- Use clear, conventional commits when possible, e.g., `feat(editor): add run button`

## Linting & Build

- Ensure `npm run lint` and `npm run build` pass before opening a PR

## Pull Requests

- Describe the change and rationale
- Add screenshots for UI changes
- Reference related issues, e.g., `Closes #123`

## Code Style

- TypeScript preferred for new code
- Keep components small and focused
- Co-locate component-specific styles; keep global styles minimal

## Tests

- Add minimal tests where practical; prefer fast unit tests and integration where applicable

## Security

- Do not commit secrets or API keys. Use environment variables and `.env.local` (gitignored).

Thank you for contributing!
