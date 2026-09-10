# CareCall: Ward Rush

An arcade nurse-call response game themed around a **CareCall** hospital nurse call system. Patients hit their call buttons, the annunciator lights up, and you sprint the ward to answer every call before the timer runs out.

Built with React 19, TypeScript, Vite and Tailwind CSS v4. The simulation and all art run on a single `<canvas>` — no game engine, no sprite assets.

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

### Scoring

Score scales with call priority, a speed bonus for time remaining, and a **combo multiplier** up to ×5 that resets on a missed call. Clearing a shift pays a completion bonus, a bonus per remaining life, and a perfect-shift bonus for zero misses. Every 10th shift grants an extra life. Top eight runs are saved to a local high-score table.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` / arrow keys | Drag anywhere on the left of the screen (floating stick) |
| Dash | `Space` / `Shift` | `DASH` button, or tap the right of the screen |
| Pause | `Esc` / `P` | Pause button in the HUD |
| Mute | `M` | Speaker button in the HUD |
| Confirm / restart | `Enter` | On-screen buttons |

## Running locally

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Deploying

`vite-plugin-singlefile` inlines all JavaScript and CSS into a **single self-contained `dist/index.html`**. There are no hashed asset URLs, so there is no `base` path to configure — the file works from any subdirectory, a file:// URL, or a USB stick.

### GitHub Pages — full walkthrough

A workflow is already in the repo at `.github/workflows/deploy.yml`. You do **not** need to configure Vite's `base` path: the build inlines all JS and CSS into one `index.html`.

**0. One-time prerequisites**

- A [GitHub](https://github.com/signup) account
- [Git](https://git-scm.com/downloads) installed
- [Node.js 20+](https://nodejs.org/) installed (`node -v` to check)

**1. Create an empty GitHub repository**

1. Open [github.com/new](https://github.com/new)
2. Repository name: anything you like, e.g. `carecall-ward-rush`
3. Visibility: **Public** (required on a free account for other people to play — GitHub Pages on private repos needs a paid plan)
4. Leave “Add a README” **unchecked** so the repo is empty
5. Click **Create repository**

**2. Put this project in that repo**

In a terminal, from the project folder:

```bash
git init
git add .
git commit -m "CareCall Ward Rush"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with the values from step 1. If GitHub asks you to sign in, use a [Personal Access Token](https://github.com/settings/tokens) or GitHub CLI — not your account password.

**3. Turn on GitHub Pages**

1. On the repo page: **Settings → Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. That’s it — do not pick “Deploy from a branch”

**4. Wait for the first deploy**

1. Open the **Actions** tab
2. You should see a run called **Deploy to GitHub Pages**
3. Wait until both **build** and **deploy** are green (about 1–2 minutes)
4. If it failed before you flipped the Pages source, click **Re-run all jobs**

**5. Play it**

The live URL is:

```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

Share that link. Anyone with it can play in the browser — no install.

**Updating later**

Change the code, then:

```bash
git add .
git commit -m "Describe the change"
git push
```

Actions rebuilds and republishes automatically.

**If the Actions run fails**

- **“Pages is not enabled”** — you skipped step 3. Enable Pages, then re-run the workflow.
- **Permission / environment errors** — Settings → Actions → General → Workflow permissions → **Read and write**. Then Settings → Environments and confirm `github-pages` exists (it is created the first time Pages is enabled).
- **Build error** — open the failed job’s log. The most common cause is a TypeScript error in the last change you pushed.

**Optional: a shorter URL**

Settings → Pages → Custom domain, then add a CNAME at your DNS provider. Not required to share the game.

### Anywhere else

Run `npm run build` and drop `dist/index.html` onto Netlify, Vercel, Cloudflare Pages, S3, or any static host.

## Branding

The Miracle Electronics logo appears in exactly one place: on the **plaque across the front of the nurses station desk** inside the ward. It sits on a white sign board, so the original navy-and-cyan artwork is used at its true colours with no reversing or recolouring. There is no Miracle Electronics text or imagery anywhere in the surrounding UI.

To swap in different artwork, replace this file — it is picked up automatically and scaled to fit the plaque:

```
public/brand/miracle-electronics.svg   (preferred — scales cleanly)
public/brand/miracle-electronics.png   (transparent or white background)
```

An identical copy is inlined as a data URI in `src/game/brand.ts`, used as a fallback so the single-file build still renders the plaque when `dist/index.html` is served on its own.

## Project structure

```
src/
  game/
    constants.ts   call types, tuning values, theme palette
    map.ts         ward geometry, collision solids, roam areas
    levels.ts      procedural difficulty curve for 50 shifts
    engine.ts      simulation: player, calls, beds, residents, scoring
    render.ts      canvas rendering (pre-rendered ward + dynamic layer)
    audio.ts       WebAudio synthesised sound effects
  components/
    GameCanvas.tsx game loop, input handling, follow camera
    Annunciator.tsx call panel (desktop + compact mobile variants)
    Hud.tsx        score, lives, combo, dash, shift progress
    Screens.tsx    start, pause, level complete, game over
  hooks/
    useHighScores.ts  localStorage high scores + level progress
```

### Performance notes

- The static ward (floors, walls, beds, furniture, signage) is rendered **once** to an offscreen canvas and blitted each frame; only entities, lighting and particles are redrawn.
- Radial-gradient glows are cached by colour and radius rather than rebuilt per frame.
- Particles are hard-capped, and HUD React state updates are throttled to ~16 Hz so the render loop is not tied to React re-renders.
- Device pixel ratio is clamped to 2 and the fixed timestep is clamped to 30 ms to avoid tunnelling after tab switches.

## Licence

No licence file is included yet — add one (MIT is the usual default for a project like this) before making the repository public, otherwise the default is "all rights reserved".

> **Note:** this is an unaffiliated fan/demo project. If "Miracle Electronics" or "CareCall" are real trademarks belonging to someone else, get permission or rename before publishing it publicly.
