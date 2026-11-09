import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { diagnose, fetchSharedScores, resetLeaderboardClient } from "../lib/leaderboard";
import {
  connectionState, reportConnection, resolveConnection, subscribeConnection, type ConnectionState,
} from "../lib/connection";
import { SCORE_LIMIT, sortScores, type ScoreEntry } from "../lib/highScores";
import { SEED_ENTRIES } from "../lib/seedScores";

export interface SharedLeaderboardState {
  /** Credentials exist (may still be offline / misconfigured). */
  configured: boolean;
  /** A read has succeeded — the board is the live shared one. */
  online: boolean;
  connection: ConnectionState;
  /** The single leaderboard everyone sees. Never empty. */
  board: ScoreEntry[];
  /** Lowest score currently holding a place, or 0 while the board has room. */
  cutoff: number;
  /** True while showing the bundled opening board instead of live data. */
  usingSeed: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reconnect: () => Promise<void>;
}

/**
 * `viewKey` identifies the visible screen so arriving on the leaderboard fetches
 * fresh scores even though the hook stayed active across the navigation.
 */
export function useSharedLeaderboard(
  active: boolean,
  localScores: ScoreEntry[],
  viewKey = "",
): SharedLeaderboardState {
  const connection = useSyncExternalStore(subscribeConnection, connectionState, connectionState);
  const [remote, setRemote] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const credentials = connection.credentials;
  const identity = credentials ? `${credentials.url}|${credentials.key}` : "";
  const online = connection.phase === "online";

  const refresh = useCallback(async () => {
    if (!connectionState().credentials) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const next = await fetchSharedScores(controller.signal);
      if (controller.signal.aborted) return;
      setRemote(next);
      setError(null);
      reportConnection(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      const failure = diagnose(err);
      setError(failure.message);
      reportConnection(false, failure);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const reconnect = useCallback(async () => {
    request.current?.abort();
    resetLeaderboardClient();
    setRemote([]);
    setError(null);
    await resolveConnection(true);
    if (connectionState().credentials) await refresh();
  }, [refresh]);

  useEffect(() => { void resolveConnection(); }, []);

  useEffect(() => {
    if (connection.phase === "online") setError(null);
  }, [connection.phase]);

  useEffect(() => {
    if (!active || !identity) {
      setLoading(false);
      return;
    }
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    // Poll only outside gameplay; the simulation never waits on the network.
    const interval = setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      request.current?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [active, identity, viewKey, refresh]);

  // One board, no source switch. Live data when reachable; otherwise the opening
  // house scores plus this player's own runs, so a first deployment is populated.
  const usingSeed = !online || remote.length === 0;
  const board = useMemo(() => {
    if (online && remote.length) return sortScores(remote).slice(0, SCORE_LIMIT);
    return sortScores([...SEED_ENTRIES, ...localScores]).slice(0, SCORE_LIMIT);
  }, [online, remote, localScores]);

  const cutoff = board.length >= SCORE_LIMIT ? board[board.length - 1].score : 0;

  return {
    configured: Boolean(credentials),
    online,
    connection,
    board,
    cutoff,
    usingSeed,
    loading,
    error,
    refresh,
    reconnect,
  };
}
