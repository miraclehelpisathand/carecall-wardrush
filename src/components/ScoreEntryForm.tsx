import { useEffect, useRef, useState } from "react";
import type { ScoreSaveResult } from "../lib/highScores";

export default function ScoreEntryForm({
  qualifies,
  sharedConfigured,
  startLevel,
  onSave,
}: {
  qualifies: boolean;
  sharedConfigured: boolean;
  startLevel: number;
  onSave: (name: string, share: boolean) => Promise<ScoreSaveResult>;
}) {
  const [name, setName] = useState("NURSE");
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ScoreSaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const canShare = sharedConfigured && startLevel === 1;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const outcome = await onSave(name, canShare && share);
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

  return (
    <form onSubmit={(event) => void save(event)} className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-2.5">
      <label htmlFor="score-nickname" className="text-[10px] tracking-[0.18em] text-amber-300">
        {qualifies ? "NEW LOCAL HIGH SCORE" : "SAVE YOUR RUN"}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="score-nickname"
          aria-label="Score nickname"
          value={name}
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={saving || Boolean(result)}
          onChange={(event) => setName(event.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2 font-mono text-base uppercase tracking-widest text-amber-200 outline-none focus:border-amber-400/60 disabled:opacity-60"
        />
        {(!result || (canShare && share && !result.sharedSaved)) && (
          <button
            type="submit"
            disabled={saving}
            className="cc-btn min-h-11 shrink-0 rounded-lg bg-amber-400 px-3 text-[10px] font-bold tracking-wider text-[#2a1a02] disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "SAVING..." : result && error ? "RETRY ONLINE" : result ? "PUBLISH" : "SAVE SCORE"}
          </button>
        )}
      </div>
      {canShare ? (
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-[11px] leading-snug text-slate-300">
          <input
            type="checkbox"
            checked={share}
            disabled={saving || result?.sharedSaved}
            onChange={(event) => setShare(event.target.checked)}
            className="h-4 w-4 shrink-0 accent-cyan-400"
          />
          Publish my nickname and score to the shared leaderboard
        </label>
      ) : (
        <p className="mt-2 text-[10px] leading-snug text-slate-500">
          {sharedConfigured ? "Shared rankings require a run from shift 1. This run is device-only." : "Scores are saved on this device."}
        </p>
      )}
      {canShare && !result?.sharedSaved && <p className="text-[10px] text-slate-500">Use a nickname, not your real name. No email or password needed.</p>}
      {result && (
        <p role="status" className="mt-2 text-[11px] leading-snug text-emerald-300">
          {result.sharedSaved ? "Published to the shared leaderboard. " : ""}
          {!result.localRanked ? "Local top 8 unchanged." : result.localPersisted ? "Saved on this device." : "Saved for this session only; browser storage is blocked."}
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-[11px] leading-snug text-amber-200">{error}</p>}
    </form>
  );
}