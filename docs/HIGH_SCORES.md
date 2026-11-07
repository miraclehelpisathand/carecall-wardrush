# Shared High Scores

The game already stores its top eight scores on each player's device. That uses
`localStorage`: it survives a refresh, but is not shared with other players and
can disappear when browsing data is cleared.

The optional **Everyone** leaderboard stores submitted scores in Supabase, a
hosted PostgreSQL database. The game itself stays on GitHub Pages or in your Divi
iframe. GitHub Pages cannot run a database or accept score writes on its own.

## 1. Create the database

1. Create a project at <https://supabase.com/dashboard>.
2. Choose the region appropriate for your players. Check the current plan,
   usage limits, and backup options before relying on it for a public release.
3. Open **SQL Editor**, then **New query**.
4. Open `supabase/migrations/202611070001_carecall_leaderboard.sql` from this
   project in a text editor. Paste its full contents into the SQL Editor and
   click **Run**. This is a one-time setup; re-running this script is safe.
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

## 3. Connect the GitHub Pages release

1. In your GitHub repository, open **Settings > Secrets and variables > Actions**.
2. Select **Variables**, then **New repository variable**.
3. Add `VITE_SUPABASE_URL` with your Project URL.
4. Add `VITE_SUPABASE_PUBLISHABLE_KEY` with your publishable key.
5. Push the updated project to `main`, or open **Actions > Deploy to GitHub
   Pages > Run workflow** and run it on `main`.

The workflow already passes these two variables to Vite. A rebuild is required
after changing them; refreshing the old website is not enough.

Leave both variables unset to keep a device-only game. Old local scores and
unlocked shifts are preserved. Nothing uploads automatically.

## 4. Test locally (optional)

Copy `.env.example` to `.env.local`, then fill in the two values. Run
`npm install` and `npm run dev`. Restart Vite after changing the environment
file. Do not commit `.env.local`.

## 5. Check that it works

1. Open the deployed game and select **Everyone** under **Top Shifts**. A new
   database correctly shows **No records yet**, not demo scores.
2. Start a new run at **shift 1** and earn some points. At game over, enter a
   nickname (eight letters/numbers/spaces maximum).
3. Tick **Publish my nickname and score to the shared leaderboard** and press
   **Save Score**. Look for **Published to the shared leaderboard**.
4. Open the game in a different browser or on a different device. Select
   **Everyone** and press **Refresh**. The score should appear if it ranks in
   the top eight.
5. Disconnect the network and try again. Device-only saving should still work;
   online saving should report an error and offer **Retry Online**, not claim
   success. Retrying a confirmed run does not create a duplicate.

Players can always save locally without ticking the publishing box. Only the
nickname, score, reached shift, server timestamp, and internal guest/run IDs
are stored by this feature. Only the nickname, score, reached shift, timestamp,
and run ID of the top eight entries are returned by the public API; guest IDs
are not returned. Supabase may also retain its normal service/auth logs.

## Ranking Rules

- Shared runs must start at shift 1, so jumping to an unlocked later shift is
  not mixed into the same leaderboard. Later-shift practice runs stay local.
- Highest score wins; ties use highest shift, then earliest submission.
- The shared database records submitted runs; only the top eight are displayed.
- Each run has a unique ID. An identical retry returns the existing record.
- A guest can submit one new run per minute. An idempotent retry does not use
  another slot. This limit is checked transactionally in the database.
- Network reads refresh on menu/game-over entry, on focus/reconnection, and once
  per minute while those screens are visible. There is no polling during play.
- Local scores are not silently uploaded or imported into the shared table.

## Security and Fair Play

The private table has Row Level Security enabled and no direct permissions for
browser users. Players cannot edit or delete scores. A read function returns
only the top eight public records. A separate write function requires an
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
| Everyone is disabled | Both build variables must be present; rebuild and redeploy. |
| Empty leaderboard | Normal for a new database; submit a scoring run from shift 1. |
| Database setup message | Run the migration in the same project as your URL/key. |
| Online saving not enabled | Enable Anonymous Sign-Ins in Supabase Authentication. |
| Wait one minute | The server rejected a second new run inside the rate limit. |
| Local save works, publish fails | Check network, project availability, anonymous auth limits, and CAPTCHA settings. |
| Wrong game scores show up | Use a dedicated Supabase project; all sites pointing to this project share this board. |
| Blocked browser storage | Local scores last for the session; guest sessions may not persist between visits. |

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