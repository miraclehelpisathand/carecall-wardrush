import { useEffect, useRef, useState } from "react";
import { SCORE_LIMIT, type ScoreSaveResult } from "../lib/highScores";

const NAME_KEY = "carecall.lastname.v1";

function rememberedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export default function ScoreEntryForm({
  qualifies,
  rank,
  canSubmit,
  practice,
  onSave,
}: {
  qualifies: boolean;
  rank: number | null;
  canSubmit: boolean;
  practice: boolean;
  onSave: (name: string) => Promise<ScoreSaveResult>;
}) {
  const [name, setName] = useState(() => rememberedName() || "NURSE");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ScoreSaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    if (qualifies) inputRef.current?.select();
    return () => { mounted.current = false; };
  }, [qualifies]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      try { localStorage.setItem(NAME_KEY, name); } catch { /* optional */ }
      const outcome = await onSave(name);
      if (!mounted.current) return;
      setResult(outcome);
      setError(outcome.error || null);
    } catch {
      if (mounted.current) setError("Your score could not be saved. Please try again.");
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const done = Boolean(result && (result.stored || result.belowCutoff));
  const canRetry = Boolean(result && !result.stored && !result.belowCutoff);

  if (!qualifies && !result) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
        <p className="text-[11px] leading-snug text-slate-400">
          {practice
            ? `Practice run — the board ranks shifts started at 1. Start a fresh run to compete for the top ${SCORE_LIMIT}.`
            : `Outside the top ${SCORE_LIMIT} this time. Beat the lowest score on the board to claim a place.`}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-2.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.18em] text-amber-300">
          {rank ? `TOP ${SCORE_LIMIT} — RANK ${rank}` : `TOP ${SCORE_LIMIT} SCORE`}
        </span>
        {done && result?.stored && (
          <span className="font-mono text-[10px] tracking-widest text-emerald-300">SAVED</span>
        )}
      </div>

      <div className="mt-1.5 flex gap-2">
        <input
          ref={inputRef}
          id="score-nickname"
          aria-label="Name for the leaderboard"
          value={name}
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={saving || done}
          onChange={(event) => setName(event.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2 font-mono text-base uppercase tracking-widest text-amber-200 outline-none focus:border-amber-400/60 disabled:opacity-60"
        />
        {!done && (
          <button
            type="submit"
            disabled={saving}
            className="cc-btn min-h-11 shrink-0 rounded-lg bg-amber-400 px-3.5 text-[10px] font-bold tracking-wider text-[#2a1a02] disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "SAVING…" : canRetry ? "RETRY" : "SAVE"}
          </button>
        )}
      </div>

      {!done && (
        <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
          {canSubmit
            ? "Your name and score go on the board for every player. No account needed."
            : "Leaderboard offline — your score is kept here and can be sent once it reconnects."}
        </p>
      )}

      {result && (
        <p role="status" className={`mt-1.5 text-[11px] leading-snug ${result.stored ? "text-emerald-200" : "text-slate-300"}`}>
          {result.stored
            ? `On the board at number ${result.rank ?? rank ?? "—"}.`
            : result.belowCutoff
              ? "The board filled up before this run landed — not in the top 20."
              : result.localPersisted
                ? "Kept on this device. Press RETRY to send it."
                : "Kept for this session only — browser storage is blocked."}
        </p>
      )}
      {error && <p role="alert" className="mt-1.5 text-[11px] leading-snug text-amber-200">{error}</p>}
    </form>
  );
}
