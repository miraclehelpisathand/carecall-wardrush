import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSharedScores, leaderboardError, sharedLeaderboardConfigured } from "../lib/leaderboard";
import type { ScoreEntry } from "../lib/highScores";

export interface SharedLeaderboardState {
  configured: boolean;
  scores: ScoreEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSharedLeaderboard(active: boolean): SharedLeaderboardState {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!sharedLeaderboardConfigured) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const next = await fetchSharedScores(controller.signal);
      if (controller.signal.aborted) return;
      setScores(next);
      setError(null);
    } catch (err) {
      if (!controller.signal.aborted) setError(leaderboardError(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active || !sharedLeaderboardConfigured) {
      setLoading(false);
      return;
    }
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    // Poll only outside gameplay; the simulation never waits for a network call.
    const interval = setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      request.current?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [active, refresh]);

  return { configured: sharedLeaderboardConfigured, scores, loading, error, refresh };
}