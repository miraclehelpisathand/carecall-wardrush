# Shared High Scores

There is **one leaderboard: the top 20 of all players.** There is no
device/global switch and no opt-in tick box. Any run that beats the 20th place is
stored in Supabase automatically once the player types a name.

GitHub Pages hosts the game; Supabase stores the scores. Pages alone cannot
accept score writes.

Until Supabase is connected the board shows the bundled **opening scores** so a
first deployment is never empty. Those same rows are seeded into the database by
the migration, and real runs replace them from the bottom up.

A local copy of the player's own runs is still kept in `localStorage` as a
personal record and as an offline queue — it is never presented as a second
leaderboard.

## "It still says Saved on this device" — read this first

If scores are not reaching Supabase, the game now tells you why. Open the score
table and press **SETUP**. The status line and **CONNECT & TEST** button check the
database immediately and name the exact problem.

The three usual causes:

1. **The site was never rebuilt after adding the GitHub variables.** They used to
   be compiled into the app, so adding them changed nothing on an already-built
   site. **This no longer applies** — configuration is now read at runtime. Edit
   `leaderboard-config.json` next to `index.html`, or use SETUP, and refresh.
2. **The SQL migration was not run.** SETUP reports *"The database tables are
   missing"* and names the file to run.
3. **Anonymous Sign-Ins are disabled.** SETUP reports it and points at the toggle.

One thing that looks like a failure but is correct:

- **Below the cutoff, there is no name box.** The 20th-place score is the bar
  (shown under the board as *"Beat X to place"*). A run beneath it shows how
  far short it fell instead of a save form — type a name only when you've earned
  a place. When you do, saving inserts your row in rank order: everyone below
  shifts down one place and the old 20th falls off.

## Fastest setup — the in-game SETUP panel

1. Open the game, find the score table, press **SETUP**.
2. Paste your **Project URL** and **publishable key**.
3. Press **CONNECT & TEST**. It reports success or the precise fix.

This stores the settings **in your browser only**, which is ideal for testing.
To turn the leaderboard on for every player, use `leaderboard-config.json` below.

## 1. Create the database

1. Create a project at <https://supabase.com/dashboard>.
2. Choose the region appropriate for your players. Check the current plan,
   usage limits, and backup options before relying on it for a public release.
3. Open **SQL Editor**, then **New query**.
4. Run **all three** migration files in order, pasting each into the editor and
   clicking **Run**:
   1. `supabase/migrations/202611070001_carecall_leaderboard.sql`
   2. `supabase/migrations/202611080001_carecall_top20_seed.sql`
   3. `supabase/migrations/202611090001_carecall_any_start.sql`

   The second raises the board to 20 places, stores only qualifying runs, and
   seeds the opening scores. The third lets every run compete regardless of
   starting shift. All are safe to re-run; none duplicate or overwrite real
   player scores. If you already ran the first two, running just the third is
   enough.
5. Under **Authentication**, find **Sign In / Providers** (sometimes called
   **Providers**) and enable **Anonymous Sign-Ins**.

Anonymous sign-in creates a guest identity behind the scenes only when a player
chooses to publish a score. It does not ask them for an email or password.
Reading the leaderboard does not create a guest account.

## 2. Get the public connection settings

Open your project's **Connect** dialog. Copy the **Project URL** and the
**publishable key** (starts with `sb_publishable_`). They are also available in
the project's API key settings. Older projects' legacy **anon** keys also work.

**Never use a secret key, service-role key, or database password.** Every
`VITE_*` value ends up in the browser bundle even if you store it in a GitHub
secret. Only a public/publishable key belongs there. The migration's database
permissions, not hiding the public key, protect the underlying table.

## 3. Connect the deployed site (no rebuild needed)

Edit **`public/leaderboard-config.json`** in your repository:

```json
{
  "url": "https://YOUR-PROJECT.supabase.co",
  "key": "sb_publishable_xxxxxxxxxxxxxxxxxxxx"
}
```

Commit it. The Pages workflow redeploys, and the game fetches this file **at
runtime** with caching disabled — so a hard refresh picks it up. You can also
edit the deployed `leaderboard-config.json` directly on your host and refresh,
with no build step at all.

This is the recommended path because it works with a prebuilt package and cannot
be defeated by a stale bundle.

### Optional: build-time variables

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are still supported as a
fallback, set under **Settings > Secrets and variables > Actions > Variables**.
They are baked in at build time, so they need a rebuild to take effect. The
runtime file and the SETUP panel both take priority over them.

Configuration is resolved in this order:

1. SETUP panel override saved in this browser
2. `?supabase_url=…&supabase_key=…` query parameters
3. `leaderboard-config.json` next to `index.html`
4. `VITE_*` build variables

Leave everything empty to keep a device-only game. Old local scores and unlocked
shifts are preserved. Nothing uploads automatically.

## 4. Test locally (optional)

Copy `.env.example` to `.env.local`, then fill in the two values. Run
`npm install` and `npm run dev`. Restart Vite after changing the environment
file. Do not commit `.env.local`.

## 5. Check that it works

1. Open the deployed game. The main menu shows the top 3; **See all 20 scores**
   opens the full Ward Honours page. A fresh database shows the 20 opening
   house records led by TONY.
2. Play a run and earn enough to beat the 20th place (the bar is shown under
   the board as *"Beat X to place"*). At game over, a name box appears with
   your projected rank. Type a nickname (eight letters/numbers/spaces maximum)
   and press **SAVE**.
3. Look for *"On the board at number N — everyone below shifts down"* and your
   row highlighted **YOU** on the board beside it.
4. Open the game in a different browser or on a different device and open the
   full leaderboard. Your score should appear in rank order; the previous 20th
   place should be gone.
5. Disconnect the network and save a qualifying run. The score is kept locally
   and the form offers **RETRY** without claiming success. Reconnect, press
   RETRY, and the same run ID is sent — no duplicate is created.

Only the nickname, score, reached shift, server timestamp, and internal
guest/run IDs are stored. Only the nickname, score, reached shift, timestamp,
and run ID of the top twenty entries are returned by the public API; guest IDs
are not returned. Supabase may also retain its normal service/auth logs.

## Ranking Rules

- **Twenty places, one board.** Highest score wins; ties use the further shift,
  then the earlier submission.
- **Every run competes**, wherever it started — starting later earns no free
  points, so there is no fairness reason to exclude those runs.
- **A placing run pushes everyone below it down one place and the 20th falls
  off.** The server enforces this with `ORDER BY … LIMIT 20`: with all places
  taken it rejects anything at or below the 20th score with `BELOW_CUTOFF`, and
  the game reports that calmly rather than as a failure. Nothing is written.
- Each run has a unique ID; an identical retry returns the existing record.
- A guest may submit one new run per minute, checked transactionally. Retries do
  not consume another slot.
- A guest identity is created only when a qualifying run is actually saved —
  never for reading the board and never for a score that misses the cut.
- Reads refresh on menu/game-over entry, on focus/reconnection, and once a minute
  while those screens are visible. There is no polling during play.

## Opening Scores

`src/lib/seedScores.ts` is the single source of truth, mirrored by the migration
and checked by `tests/seed.test.ts`. Values come from the game's real scoring
model (`npx tsx scripts/score-curve.ts`), so each entry sits in the plausible
cumulative band for the shift it reached.

| # | Name | Score | Shift |
| --- | --- | --- | --- |
| 1 | TONY | 248,650 | 20 |
| 2 | MATRON | 231,480 | 19 |
| 3 | NURSE JO | 214,905 | 19 |
| … | … | … | … |
| 20 | INTERN | 12,460 | 4 |

TONY leads on a strong run ending around shift 20. To clear the house scores,
delete the seeded rows in the SQL Editor:

```sql
delete from carecall_private.scores where is_seed = true;
```

## Security and Fair Play

The private table has Row Level Security enabled and no direct permissions for
browser users. Players cannot edit or delete scores. A read function returns
only the top twenty public records. A separate write function requires an
authenticated guest, validates values, stamps server time, checks the run ID,
and applies a per-guest rate limit. Both functions use an empty `search_path`
and narrowly scoped execution grants.

**This is a casual leaderboard, not cheat-proof competition scoring.** The game
runs in the browser, so a determined person can fabricate a plausible score,
claim a shift-1 start, or reset their guest identity. Validation and guest rate
limits reduce mistakes/spam but do not prove that a run was played honestly.
For prizes or serious competition, use a server that verifies game events or
replays, with server-issued run IDs, global/IP rate limits and moderation.

Supabase recommends CAPTCHA/Turnstile to protect anonymous registrations for a
large public audience. This integration does not yet render a CAPTCHA widget:
enabling Supabase's CAPTCHA requirement without adding a token flow will reject
new guest submissions. Add that flow or use a protected server endpoint before
opening a high-traffic public competition. Monitor usage and auth rate limits;
a new guest account is not the same thing as a verified person.

## Administration

Raw records live in the **carecall_private** schema, not in the exposed public
schema. As the project owner, use the SQL Editor to view or moderate them:

```sql
select run_id, name, score, level, created_at
from carecall_private.scores
order by score desc, level desc, created_at asc;
```

Remove an inappropriate record by its `run_id` using the SQL Editor. There is no
browser-accessible delete function. Take backups appropriate to your Supabase
plan. Deleting a Supabase guest account also deletes its submitted scores.
Do not delete all anonymous accounts as routine cleanup if you want to retain
their leaderboard entries.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Score not on the board | It must beat the 20th place. The game-over screen shows how short it fell. Open **SETUP** to check the connection. |
| "board filled up before this run landed" | Someone claimed the last place first. Not an error — play again. |
| Status: LOCAL | No credentials found, so the opening board is shown. Fill `leaderboard-config.json`, or paste them into SETUP. |
| Status: Needs attention | Read the message — it distinguishes missing tables, a rejected key, and a network failure. |
| Empty leaderboard | Run the second migration to seed the opening 20. |
| "Database tables are missing" | Run the migration in the same project as your URL/key, then press RETEST. |
| "Guest submissions are switched off" | Enable Anonymous Sign-Ins in Supabase Authentication. |
| "Rejected the publishable key" | Copy the publishable key again; never use a secret or service-role key. |
| Wait one minute | The server rejected a second new run inside the rate limit. |
| Local save works, publish fails | Press RETRY ONLINE. The same run ID is reused, so no duplicate is created. |
| Wrong game scores show up | Use a dedicated Supabase project; all sites pointing to this project share this board. |
| Blocked browser storage | Local scores last for the session; guest sessions may not persist between visits. |
| Config edit had no effect | Hard-refresh. If you changed `VITE_*` variables instead of the JSON file, a rebuild is required. |

GitHub deployment publishes only `dist/`. This SQL script is supplied for you to
run in Supabase; GitHub Actions does not create the database or store database
credentials. Nothing about this setup needs a WordPress plugin.

## Developer Checks

```bash
npm run typecheck
npx tsx --test tests/*.test.ts
npm run build
```

The database tests use an embedded PostgreSQL engine with stubbed Supabase auth
roles. They check privileges, validation, ranking, retries and rate limits, but
do not replace testing with your actual Supabase project after configuration.

## Official Documentation

- <https://supabase.com/docs/guides/auth/auth-anonymous>
- <https://supabase.com/docs/guides/database/functions>
- <https://supabase.com/docs/guides/api/api-keys>