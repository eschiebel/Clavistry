# Clavistry

A web app for playing Afro-Caribbean rhythms defined in tablature JSON.

This is very much a work in progress.

FWIW, GPT-5 wrote almost all of the code. I have mixed emotions. I was looking forward to working on this
project, but with AI help I got a working app in an afternoon. I guesss this is what it means to be
a software engineer now.

## TODO
- needs tests
- need a way to upload rhythm json
- I might want to use samples rather than synthesized voices
- More stuff I haven't thought of yet

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
  "name": "Bembe",
  "time_signature": "6/8",
  "parts": {
    "bell": "|x.x.xx|.x.x.x|",
    "quinto": "|ts.tTT|ts.tTT|",
    "conga": "|ptT.s.|ptT.s.|",
    "tumba": "|T.BBtt|T.BBtt|"
  }
}
```

