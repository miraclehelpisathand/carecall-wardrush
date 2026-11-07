# Upload CareCall Ward Rush to GitHub

This package contains the complete source code for the game and the GitHub Pages deployment workflow.

It does **not** include `node_modules`, `dist`, or private local settings. GitHub will install dependencies and build the game automatically.

---

## What you need

- A GitHub account.
- This ZIP file.
- Optional: Node.js 20 or newer if you want to run the game on your own computer first.

---

## Option A — Upload using the GitHub website

This is the easiest method if you do not want to use command-line Git.

### 1. Create a repository

1. Sign in to GitHub.
2. Click **New repository**.
3. Name it something like `carecall-ward-rush`.
4. Choose **Public** if you want anyone to play it.
5. Click **Create repository**.

### 2. Unzip the package

Unzip `carecall-ward-rush-github.zip`.

You should see files and folders such as:

```text
.github/
docs/
public/
scripts/
src/
supabase/
tests/
.env.example
.gitignore
.nvmrc
index.html
LICENSE
package.json
package-lock.json
README.md
tsconfig.json
UPLOAD-TO-GITHUB.md
vite.config.ts
```

### 3. Show hidden files

Some important files start with a dot, especially:

```text
.github/
.gitignore
.nvmrc
.env.example
```

Make sure your file manager is showing hidden files before uploading.

- **Windows File Explorer:** View → Show → Hidden items.
- **macOS Finder:** press `Command + Shift + .`

### 4. Upload the files

On your new GitHub repository page:

1. Click **uploading an existing file**, or **Add file → Upload files**.
2. Open the unzipped folder.
3. Select **all files and folders inside it**.
4. Drag them into GitHub.
5. Wait for the upload to finish.
6. Click **Commit changes**.

Important: upload the **contents** of the unzipped folder, not just the outer folder itself. The repository root should contain `package.json` and `.github/workflows/deploy.yml`.

### 5. Turn on GitHub Pages

1. Open your repository’s **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### 6. Wait for the game to deploy

1. Open the **Actions** tab.
2. Wait for **Deploy to GitHub Pages** to finish.
3. If GitHub asks you to enable workflows, approve that.

Your game will be available at:

```text
https://YOUR-USERNAME.github.io/REPOSITORY-NAME/
```

Example:

```text
https://alex.github.io/carecall-ward-rush/
```

---

## Option B — Upload using Git

If you already use Git, run these commands from the unzipped project folder:

```bash
git init
git add .
git commit -m "Initial CareCall Ward Rush release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/REPOSITORY-NAME.git
git push -u origin main
```

Then enable GitHub Pages:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

---

## Optional: add the real logo

The game can display a logo on the nurses station plaque.

Add one of these files before deploying:

```text
public/brand/logo.svg
```

or:

```text
public/brand/logo.png
```

SVG is preferred. If you use PNG, export it large and with a transparent or white background.

If no logo file is present, the game uses a built-in placeholder.

---

## Optional: enable shared high scores

By default, high scores are saved on each player’s device.

To enable a shared leaderboard for all players, follow:

```text
docs/HIGH_SCORES.md
```

That guide explains how to connect Supabase and add the two public connection variables in GitHub Actions.

You do **not** need shared high scores for the game to work.

---

## Run the game locally

From the project folder:

```bash
npm install
npm run dev
```

Open the local address shown in the terminal, usually:

```text
http://localhost:5173
```

To create a production build:

```bash
npm run build
```

The built game is written to `dist/`.

---

## Regenerate this ZIP

If you change the project and want a fresh GitHub upload package:

```bash
node scripts/package-release.mjs
```

This creates:

```text
public/downloads/carecall-ward-rush-github.zip
public/downloads/SHA256SUMS.txt
public/downloads/package-manifest.json
```

---

## Troubleshooting

### The GitHub Actions build fails

Open the failed workflow in the **Actions** tab and read the first red error.

Common causes:

- `package.json` or `package-lock.json` was not uploaded.
- `.github/workflows/deploy.yml` was not uploaded because hidden files were not visible.
- The repository is using a different branch. The workflow deploys from `main`.

### The site is blank

Check:

1. **Settings → Pages** is set to **GitHub Actions**.
2. The workflow finished successfully.
3. You are opening the correct URL:
   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`
4. Wait 30–60 seconds after deployment, then hard-refresh.

### The game works, but shared scores are disabled

That is normal until Supabase is configured.

The local **My Device** leaderboard still works.

### I uploaded the ZIP but GitHub shows only one ZIP file

You uploaded the ZIP itself instead of its contents.

Unzip it first, then upload the files and folders inside it.

---

## Do not upload these

These are generated or private and should not be committed:

```text
node_modules/
dist/
.cache/
.env
.env.local
```

The included `.gitignore` already excludes them.
