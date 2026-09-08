# Our Next Date

A private, tactile, boutique-stationery date and hangout planner for two partners. Either partner can propose a date, select timing, cravings, custom venues, and personal notes, sealed with an authentic wax stamp micro-interaction. Proposals generate permanent shareable keepsake tickets with calendar exports, countdowns, and an intimate dashboard.

## Features

- **Mutual Planning**: Built symmetrically for both partners — either person can draft and seal a date proposal.
- **Boutique Stationery Aesthetics**: Fraunces serif typography, Work Sans, Caveat handwritten notes, letterpress cards, warm terracotta color palette, and authentic paper texture overlays.
- **Physical Wax Seal Micro-Interaction**: Interactive press-and-hold wax seal with tension build-up, synthesized tactile audio, and wax stamp animation.
- **Self-Contained Keepsake Tickets**: Zero external databases required. Tickets are preserved in browser `localStorage` and shared via self-contained encrypted/URL-safe base64 tokens (`?share=...`), instant Web Share API, and copyable links.
- **Calendar & Countdown**: Add-to-Calendar one-click Google Calendar links, `.ics` calendar file downloads, and a live postmark stamp countdown badge.
- **Private Partner Dashboard**: Clean, low-chrome overview of upcoming and completed dates with quick deep links to sealed keepsake tickets.
- **Synthesized Tactile Audio**: Pure Web Audio API acoustic feedback (zero external audio files, respects mute toggles and `prefers-reduced-motion`).
- **Zero Tracking & Privacy First**: No external analytics, no tracking cookies, no server databases, and pre-configured with `<meta name="robots" content="noindex">` to prevent public search engine indexing.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (or 20+)
- npm, pnpm, or bun

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
The app will be available locally at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
Build outputs are generated in the `dist/` directory.

### 4. Type Check & Lint
```bash
npm run lint
```

---

## Production Deployment

This is a pure static single-page application built with Vite and React. It requires **no server, no database, and no API keys**.

### Deploy to Vercel
1. Import the Git repository in Vercel.
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. No environment variables required. Click **Deploy**.

### Deploy to Netlify / Cloudflare Pages / GitHub Pages
Deploy the `dist/` folder with standard SPA routing fallback to `index.html`.

---

## Architecture & Privacy

1. **Client-Side Storage**: All date proposals and tickets are stored locally in the user's browser `localStorage`.
2. **Sharing Mechanism**: When a ticket is shared, the proposal payload is encoded into a secure URL token (`?share=...`). Opening the link on a partner's device immediately decodes the ticket and imports it into their local dashboard.
3. **No External Credentials**: Zero third-party API keys or cloud database credentials are required or bundled.

---

## Tech Stack

- **Framework**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, Custom CSS tokens
- **Motion**: Motion (Framer Motion v12)
- **Icons**: Lucide React
- **Storage**: Browser LocalStorage & URL State Encoding
- **Audio**: Web Audio API synthesizer
- **Bundler**: Vite 6
