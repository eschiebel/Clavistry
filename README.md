# Clavistry

  A web app for playing Afro-Caribbean rhythms defined in tablature JSON.

  This is very much a work in progress.

  FWIW, AI wrote almost all of the code. I have mixed emotions. I was looking forward to working on this
  project, but with AI's help I got a working app in an afternoon and in a fairly polished state in
  three days. It wasn't _easy_, but certainly faster than doing it by hand. I know what's going on,
  but not nearly to the depth if I had done it alone. I guesss this is what it means to be a software engineer now.

  ## TODO
  - needs tests
  - need a way to upload rhythm json
  - More stuff I haven't thought of yet

  ## Stack
  - Node.js (>=18) and npm
  - TypeScript
  - React (Vite)
  - Biome (lint/format)
  - Web Audio API

  ## Getting Started
 1. Install dependencies:
    ```sh
    npm install
    ```
 2. Start the dev server:
    ```sh
    npm run dev
    ```
 3. Open http://localhost:5173 and click Start to allow audio.

### Build and Preview
- Build:
  ```sh
  npm run build
  ```
- Preview the production build:
  ```sh
  npm run preview
  ```

  ## Rhythm Format (tablature JSON)
  See `public/rhythms/tumbao.json` and the notes in `# DrumsElementary.md`.

  The parts are defined as strings of characters that correspond to different drum hits.
  The characters are:
  - `.`: rest
  - `x`: stroke (typically for bell/clave/ etc.)
  - `P`: palm
  - `t`: touch
  - `T`: open tone
  - `s`: slap
  - `M`: muff
  - `B`: bass

  
Rhythm parts are mapped to samples in `public/samples/map.json`.
