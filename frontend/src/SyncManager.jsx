/**
 * SyncManager.jsx — Offline operation queue replay engine.
 *
 * Mounts as a wrapper at the app root.  Provides a React context so any
 * component can read { pendingCount, isSyncing, lastSyncAt, serverReachable }.
 *
 * How it works:
 *  1. On mount: reads pending count from IndexedDB.
 *  2. Polls every 15 s (when ops are pending / server was down) or 60 s (idle).
 *  3. Also fires immediately on the browser 'online' event.
 *  4. Health-check: GET /api/auth/me with a 5-second timeout.
 *     Treats HTTP 200 AND 401 as "server is up" (401 = up but token issue).
 *  5. When server is reachable and there are pending ops: replays them in
 *     insertion order, removing each after a 2xx/204.  Stops on auth failure
 *     or server error (ops stay in queue for next cycle).
 */

import React, {
    useState, useEffect, useRef, useCallback, createContext, useContext,
} from 'react';
import { getAll, remove } from './offlineQueue';
import api from './api';

// ─── Context ──────────────────────────────────────────────────────────────

export const SyncContext = createContext({
    pendingCount:    0,
    isSyncing:       false,
    lastSyncAt:      null,   // Date | null
    serverReachable: true,
});

export function useSyncStatus() {
    return useContext(SyncContext);
}

// ─── Constants ────────────────────────────────────────────────────────────

const POLL_FAST_MS = 15_000;   // when ops pending or server was down
const POLL_IDLE_MS = 60_000;   // when idle and server is up

// ─── SyncManager component ────────────────────────────────────────────────

export default function SyncManager({ children }) {
    const [pendingCount,    setPendingCount]    = useState(0);
    const [isSyncing,       setIsSyncing]       = useState(false);
    const [lastSyncAt,      setLastSyncAt]      = useState(null);
    const [serverReachable, setServerReachable] = useState(true);

    // Ref guards to prevent concurrent replay loops
    const isSyncingRef    = useRef(false);
    const timeoutRef      = useRef(null);
    // Track if the last poll found server reachable (for interval tuning)
    const serverWasUpRef  = useRef(true);

    // ── Refresh badge count from IDB ──────────────────────────────────────

    const refreshCount = useCallback(async () => {
        const ops = await getAll();
        setPendingCount(ops.length);
        return ops.length;
    }, []);

    // Expose to api.js so it can ping us after enqueueing (no circular import needed)
    useEffect(() => {
        window.__plisRefreshPendingCount = refreshCount;
        return () => { delete window.__plisRefreshPendingCount; };
    }, [refreshCount]);

    // Read initial count on mount
    useEffect(() => {
        refreshCount();
    }, [refreshCount]);

    // ── Health check ──────────────────────────────────────────────────────

    const checkServer = useCallback(async () => {
        const token = api.getToken();
        if (!token) return false;   // not logged in — nothing to check
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
                signal:  controller.signal,
            });
            clearTimeout(timer);
            // 200 = server up & token valid; 401 = server up but token expired → still reachable
            return res.ok || res.status === 401;
        } catch {
            return false;
        }
    }, []);

    // ── Replay queued ops in order ────────────────────────────────────────

    const replayQueue = useCallback(async () => {
        if (isSyncingRef.current) return false;

        const ops = await getAll();
        if (ops.length === 0) return true;

        isSyncingRef.current = true;
        setIsSyncing(true);

        let allOk = true;

        for (const op of ops) {
            const token = api.getToken();
            if (!token) { allOk = false; break; }   // user logged out mid-replay

            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 10_000);

                const res = await fetch(`/api${op.path}`, {
                    method:  op.method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization:  `Bearer ${token}`,
                    },
                    // body is already a JSON string from enqueue()
                    body:   op.body ?? undefined,
                    signal: controller.signal,
                });
                clearTimeout(timer);

                if (res.ok || res.status === 204) {
                    // Success — remove from queue
                    await remove(op.id);

                } else if (res.status === 409 || res.status === 422) {
                    // Conflict / validation error — will never succeed, drop it
                    console.warn('[PLIS Sync] Dropping op (unrecoverable):', op.label, res.status);
                    await remove(op.id);

                } else if (res.status === 401) {
                    // Token expired — stop replaying, leave ops in queue
                    allOk = false;
                    break;

                } else {
                    // Server error (5xx) — leave in queue, retry next cycle
                    allOk = false;
                    break;
                }

            } catch {
                // Network failure mid-replay (server went away again)
                allOk = false;
                break;
            }
        }

        await refreshCount();
        setLastSyncAt(new Date());
        setIsSyncing(false);
        isSyncingRef.current = false;
        return allOk;
    }, [refreshCount]);

    // ── Main polling loop ─────────────────────────────────────────────────

    const tick = useCallback(async () => {
        const n = await refreshCount();

        // Determine whether we even need to check the server
        if (n === 0 && serverWasUpRef.current) {
            // Nothing pending & server was fine last time — skip expensive check
            return;
        }

        const reachable = await checkServer();
        setServerReachable(reachable);
        serverWasUpRef.current = reachable;

        if (reachable && n > 0) {
            await replayQueue();
        }
    }, [refreshCount, checkServer, replayQueue]);

    useEffect(() => {
        let cancelled = false;

        const schedule = async () => {
            if (cancelled) return;
            await tick();
            if (cancelled) return;

            // Faster polling when we know there are pending ops or server was down
            const pending  = await getAll();
            const interval = (pending.length > 0 || !serverWasUpRef.current)
                ? POLL_FAST_MS
                : POLL_IDLE_MS;

            timeoutRef.current = setTimeout(schedule, interval);
        };

        // Kick off immediately
        schedule();

        // Also trigger when browser reports it has connectivity again
        const onOnline = () => {
            clearTimeout(timeoutRef.current);
            schedule();
        };
        window.addEventListener('online', onOnline);

        return () => {
            cancelled = true;
            clearTimeout(timeoutRef.current);
            window.removeEventListener('online', onOnline);
        };
    }, [tick]);

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <SyncContext.Provider value={{ pendingCount, isSyncing, lastSyncAt, serverReachable }}>
            {children}
        </SyncContext.Provider>
    );
}
