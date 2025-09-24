# Clavistry

React + TypeScript + Vite app using Elementary Audio, per `# DrumsElementary.md`.

## Stack
- Bun (runtime and package manager)
- TypeScript
- React (Vite)
- Biome (lint/format)
- Elementary Audio (`@elemaudio/core`, `@elemaudio/web-renderer`)

## Getting Started
1. Install dependencies (with Bun):
   ```sh
   bun install
   ```
2. Start the dev server:
   ```sh
   bun run dev
   ```
3. Open http://localhost:5173 and click Start to allow audio.

## Rhythm Format (tablature JSON)
See `public/rhythms/bembe.json` and the notes in `# DrumsElementary.md`.

Example structure:
```json
{
  "name": "bembe",
  "time_signature": "6/8",
  "parts": {
    "bell": "|x.x.xx|.x.x.x|",
    "quinto": "|ts.tTT|ts.tTT|",
    "conga": "|ptT.s.|ptT.s.|",
    "tumba": "|T.BBtt|T.BBtt|"
  }
}
```

## Next Steps
- Parse tablature JSON and schedule events.
- Map stroke symbols (T, s, M, B, p, t, x, ., |) to synthesized or sampled voices.
- Build transport (tempo, start/stop, loop) and mixer UI.
