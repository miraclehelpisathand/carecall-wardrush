# CareCall: Ward Rush

An arcade nurse-call response game themed around the **CareCall** hospital nurse call system. Patients hit their call buttons, the annunciator lights up, and you sprint the ward to answer every call before the timer runs out.

Built with React 19, TypeScript, Vite and Tailwind CSS v4. The simulation and all art run on a single `<canvas>` — no game engine, no sprite assets.

## Release v1.0.0

- **50 shifts** of procedurally scaled difficulty, 3 lives, combo scoring up to ×5, a shared top-20 leaderboard and shift-unlock progress.
- **Four call types** on the annunciator — emergency (red), patient (green), nurse assist (amber), keys (purple) — each with its own timer, sound and lamp behaviour.
- **Task calls**: meal trays from the pantry slow you down; toilet assists need a walking-pace escort to the WC with a live countdown.
- **Accident system**: a timed-out escort leaves a spill — grab the mop at the station, scrub it clean for points, or slip on it mid-sprint.
- **A living ward**: patients doze in every bed, sit up and wave when calling, and shout lines (*"I'VE FALLEN!"*, *"CUP OF TEA?"*); residents wander the halls; beds roll loose down the corridors; evening and night shifts dim the lights.
- **Juice**: screen shake, particle bursts, hit-flash, floating score text, combo pops and a full WebAudio synth SFX kit — no audio files.
- **Responsive by detection**: viewport + pointer classification drives desktop side-rail vs mobile overlay HUD, a portrait-phone rotate gate that pauses the shift, safe-area insets, and a zoomed follow camera on small screens. Fullscreen + orientation lock attempted on handhelds.
- **Deployment**: single-file production build (`dist/index.html`), GitHub Actions → Pages workflow with relative base (works at `/<repo>/` and site root), and a documented WordPress/Divi iframe embed path.

---

## Quick start

Install Node.js 20 (use the `.nvmrc` if you have nvm), then:

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

## Downloadable GitHub package

To create a clean ZIP that can be uploaded to GitHub:

```bash
node scripts/package-release.mjs
```

This writes:

```text
public/downloads/carecall-ward-rush-github.zip
public/downloads/SHA256SUMS.txt
public/downloads/package-manifest.json
```

The ZIP contains the source code, GitHub Pages workflow, tests, and setup guides.
It excludes `node_modules`, `dist`, caches, and private local environment files.

For step-by-step upload instructions, see [UPLOAD-TO-GITHUB.md](UPLOAD-TO-GITHUB.md).

## Shared High Scores

The main menu shows the **top three** with a *See all 20 scores* link through to a
dedicated **Ward Honours** page (podium, places 4–20, board stats). That page
returns to the menu from its header, its footer, or `Esc`.

There is **one leaderboard: the top 20 of all players**, stored in Supabase.
Any run that beats the 20th place is saved automatically once the player enters a
name — no device/global switch and no opt-in tick box. GitHub Pages hosts the
game; Supabase stores the scores.

A fresh deployment opens with twenty seeded house scores led by **TONY** on
248,650 (a run ending around shift 20), so the board is never empty. Real runs
replace them from the bottom up.

Follow [the shared leaderboard setup guide](docs/HIGH_SCORES.md) to run the
included SQL migration, enable anonymous guest sign-ins, and fill in
`public/leaderboard-config.json`. Without those settings the game works in
local-only mode. No live database is included or created automatically.

**Connection is configured at runtime, not baked into the build.** The game reads
`leaderboard-config.json` sitting next to `index.html`, so you can connect a
database by editing that one file and refreshing — no rebuild required. There is
also a **SETUP** button on the in-game score table with a **CONNECT & TEST** action
that checks the database live and names the exact problem (missing tables, guest
sign-ins disabled, rejected key, or network failure).

The score table shows a live status indicator, and saving reports **SHARED** and
**DEVICE** outcomes on separate lines so a local save is never mistaken for a
published one.

## Deploying to GitHub Pages

You can deploy from any branch — `main` is the convention used here. Push once, GitHub Actions handles the rest.

### 1. Create the repo on GitHub

- **Normal URL (`/<user>.github.io/<repo>/`)** — create a new repository with any name (e.g. `carecall-ward-rush`).
- **Shortest URL (`/<user>.github.io/`)** — name the repo **`<username>.github.io`** and the game lives at the site root.

Then commit and push this folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### 2. Turn on Pages

On GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

If the Actions tab asks you to enable workflows, click that button.

### 3. Wait for the deploy

Open the **Actions** tab — the workflow called "Deploy to GitHub Pages" is configured to run on every push to `main`. When it finishes, your site is at:

- `https://<username>.github.io/<repo>/` (named repo), or
- `https://<username>.github.io/` (named `<username>.github.io`)

`vite-plugin-singlefile` inlines all JS/CSS into a single `dist/index.html`, so there are no hashed asset URLs to break on a `/repo/` subpath.

### Troubleshooting

- **Page is blank** — wait 30–60 seconds then hard-refresh; check Actions for a failed build.
- **Build fails in Actions** — open the failed job's log; usually it’s a Node version mismatch, fixed by `nvm use` or by setting `node-version: 20` in `.github/workflows/deploy.yml`.
- **Pages still says "Your site is ready"** — that's the default Pages welcome. You haven't yet pointed Pages at GitHub Actions (Settings → Pages → Source).
- **Local `npm install` warns about peer deps** — ignored; harmless with the versions pinned in `package.json`.

### Deploying to other hosts

Run `npm run build` and upload the contents of `dist/` to Netlify, Vercel, Cloudflare Pages, S3 or any static host. No server-side runtime needed.

---

## Embedding in WordPress (Divi code module)

**Yes — via an iframe.** Don't paste the built HTML directly into a Divi code module: the game ships CSS that pins `body` to the viewport (`position: fixed`), so injected raw it would hijack and freeze your whole WordPress page. An `<iframe>` gives the game its own document and keeps it fully isolated.

### Recommended: iframe your GitHub Pages deploy

Deploy to Pages as described above, then in Divi add a **Code module** and paste:

```html
<iframe
  src="https://YOUR-USERNAME.github.io/YOUR-REPO/"
  title="CareCall Ward Rush"
  loading="lazy"
  allow="fullscreen; autoplay"
  style="display:block; width:100%; height:min(100svh, 720px); min-height:420px; border:0; background:#05090f;">
</iframe>
```

Replace the `src` with your live Pages URL. The game stays in sync with every push to `main` — you never touch WordPress again.

For a **full-bleed "the game IS the page"** experience: create the page with the **Blank** template, one full-width section with a single Code module, and set the iframe height to `100svh` (drop the `min()` cap).

### Alternative: self-host on your own domain

If you'd rather serve it from WordPress itself (same domain, no external request):

1. Run `npm run build` locally.
2. Upload `dist/index.html` to `wp-content/uploads/carecall/index.html` via **cPanel File Manager or (S)FTP**. The WordPress **Media Library refuses `.html` uploads**, so don't try it there.
3. Point the iframe `src` at `https://your-site.com/wp-content/uploads/carecall/index.html`.

Because the whole game is one self-contained HTML file, that single upload is the entire deployment.

### Gotchas

- `allow="fullscreen"` is what lets the phone's fullscreen/orientation trick work inside the embed; without it the request is silently refused and the game simply runs inside the frame.
- Portrait phones will show the rotate-the-device gate inside the embed — that's intended behaviour.
- Security plugins (Wordfence, etc.) sometimes flag iframes to external domains. If the frame comes up blank, whitelist your Pages domain.
- Device scores and progress are stored per-visitor in their browser (`localStorage`), scoped to the domain the game actually runs from. If the optional Supabase leaderboard is configured, published scores are shared by everyone using that Supabase project, including the Divi embed.

---

## How the build/deploy pipeline works

```
push to main
  → .github/workflows/deploy.yml
    → npm install
    → npm run build → dist/
    → touch dist/.nojekyll  + cp dist/index.html dist/404.html  (SPA + GitHub Pages fix)
    → upload dist/ as a Pages artifact
    → pages environment deploy
    → https://<user>.github.io/<repo>/
```

`.nojekyll` tells GitHub Pages to serve the `dist/` folder as-is (instead of trying to run it through Jekyll, which breaks modern SPAs). Copying `index.html → 404.html` makes direct deep-links fall back to the SPA.

---

## Gameplay

You are the nurse on shift. Calls appear on the **annunciator** panel and on the over-door lamps in the ward. Run to the room, stand at the call point until the reset ring fills, and the call clears. Clear every call in the shift, then return to the **nurses station** to finish.

**Three lives. Fifty shifts. A missed call costs a life.**

### Call types

| Colour | Call | Behaviour |
| --- | --- | --- |
| 🔴 Red | Emergency | Highest priority, shortest fuse, biggest score |
| 🟣 Purple | Keys | Collect the key ring from the nurses station first |
| 🟠 Amber | Nurse assist | A colleague needs a hand |
| 🟢 Green | Patient call | Standard bedside call |

### Complications

- **Rolling beds** career down the corridors. Getting hit stuns you, breaks your combo and makes you drop whatever you're carrying.
- **Residents** wander the halls and physically block you — push past and they'll let you know about it.
- **Meal calls** (🍽️) require a tray from the pantry, which slows your movement.
- **Toilet assists** (🚻) require escorting a resident to the WC at walking pace, against a countdown.
- **Accidents** (🧹) happen if an escort doesn't reach the WC in time. Fetch the mop from the nurses station and stand over the spill to clean it. Sprint through an uncleaned spill and you'll slip over. Spills left at the end of a shift reduce your bonus.
- **Lighting drops** on evening shifts and again on night shifts, reducing visibility to a torch radius.

Patients occupy every bed. They doze when settled, sit up and wave when they need you, and speak up — *"NURSE?"*, *"I'VE FALLEN!"*, *"I NEED THE LOO!"* — with a *"THANK YOU!"* once you answer.

A phone/tablet held in **portrait** is blocked by a rotate-the-device gate until you turn it; the shift is paused while you rotate so calls can't expire.

### Scoring

Score scales with call priority, a speed bonus for time remaining, and a **combo multiplier** up to ×5 that resets on a missed call. Clearing a shift pays a completion bonus, a bonus per remaining life, and a perfect-shift bonus for zero misses. Every 10th shift grants an extra life. Runs that beat the 20th place are stored on the shared leaderboard.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` / arrow keys | Drag anywhere on the left of the screen (floating stick) |
| Dash | `Space` / `Shift` | `DASH` button, or tap the right of the screen |
| Pause | `Esc` / `P` | Pause button in the HUD |
| Mute | `M` | Speaker button in the HUD |
| Confirm / restart | `Enter` | On-screen buttons |

---

## Project structure

```
public/
  brand/                  drop the real logo here (logo.svg or logo.png) — see Brand section
src/
  game/
    constants.ts   call types, tuning values, theme palette
    map.ts         ward geometry, collision solids, roam areas
    levels.ts      procedural difficulty curve for 50 shifts
    engine.ts      simulation: player, calls, beds, residents, scoring
    render.ts      canvas rendering (pre-rendered ward + dynamic layer)
    audio.ts       WebAudio synthesised sound effects
    brand.ts       brand artwork loader with placeholder fallback
  components/
    GameCanvas.tsx     game loop, input handling, follow camera
    Annunciator.tsx    call panel (desktop + compact mobile variants)
    Hud.tsx            score, lives, combo, dash, shift progress
    Screens.tsx        start, pause, level complete, game over
    ScoresPage.tsx     full top-20 ward honours page
    LandscapeGate.tsx  portrait-phone gate, blocks the app
  hooks/
    useDevice.ts       viewport / touch / orientation classification
    useHighScores.ts   personal run record + offline queue, level progress
    useSharedLeaderboard.ts  optional shared leaderboard loading
  lib/
    highScores.ts      score validation, ranking, and run identifiers
    seedScores.ts      the twenty opening house scores
    leaderboard.ts     Supabase guest sessions and score API
  utils/cn.ts          Tailwind class combiner
index.html             HTML entry — viewport meta + PWA-ish tags
vite.config.ts         Vite + React + Tailwind + singlefile plugins
.github/workflows/deploy.yml   GitHub Pages deploy workflow
scripts/package-release.mjs  creates the GitHub upload ZIP
supabase/migrations/          database setup SQL (base + top-20 seed)
docs/HIGH_SCORES.md           shared leaderboard setup and security notes
tests/                        local score and database permission tests
UPLOAD-TO-GITHUB.md           beginner-friendly GitHub upload guide
```

## Branding

The game canvas leaves room for a plaque on the nurses-station desk where you can drop a custom logo. Add **either**:

```
public/brand/logo.svg     ← best: true vector, sharp at any zoom
public/brand/logo.png     ← fallback: 2000px+ transparent export
```

If no file is present, a hand-drawn placeholder is rendered so the plaque isn't blank.

## Performance notes

- The static ward (floors, walls, beds, furniture, signage) is rendered **once** to an offscreen canvas and blitted each frame; only entities, lighting and particles are redrawn.
- Radial-gradient glows are cached by colour and radius rather than rebuilt per frame.
- Particles are hard-capped, and HUD React state updates are throttled to ~16 Hz so the render loop is not tied to React re-renders.
- Device pixel ratio is clamped to 2 and the fixed timestep is clamped to 30 ms to avoid tunnelling after tab switches.

## Licence

MIT — see [LICENSE](./LICENSE). No third-party game-engine or sprite assets are required; everything in `src/game/` is original to this project.

> **Note:** this is an unaffiliated fan/demo project. If "Miracle Electronics" or "CareCall" are real trademarks belonging to someone else, get permission or rename before publishing it publicly.
