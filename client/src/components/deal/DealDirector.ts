// ============================================
// HUKUM - DEAL DIRECTOR (presentation-only state machine)
//
// The server deals instantly and never broadcasts a "dealing" phase.
// This store watches public state for card counts going UP and turns
// that into a visual deal job. It never creates, shuffles or reveals
// card identities: it only decides how many of the server-provided
// cards each seat shows while the animation runs.
//
// Stage flow:
//   IDLE → DECK_ENTERING → SHUFFLING → SHUFFLE_COMPLETE → DEALING → DEAL_COMPLETE → READY
// (second half of a hand skips the shuffle stages)
// ============================================

import type { Card, GamePhase, PlayerId, PublicGameState } from '../../types';

export type DealStage =
    | 'IDLE'
    | 'DECK_ENTERING'
    | 'SHUFFLING'
    | 'SHUFFLE_COMPLETE'
    | 'DEALING'
    | 'DEAL_COMPLETE'
    | 'READY';

export interface DealJob {
    id: number;
    /** New hand: full shuffle. Second half of a hand: deal only. */
    shuffle: boolean;
    reduced: boolean;
    /** Player ids in server seat order (the order the server deals in) */
    order: PlayerId[];
    /** Cards each seat already shows when the job starts */
    start: Record<PlayerId, number>;
    /** Cards each seat should show when the job ends (from server counts; may grow mid-job) */
    targets: Record<PlayerId, number>;
    /** My card ids already visible before this job (kept in place) */
    baseIds: string[];
}

export interface DealSnapshot {
    stage: DealStage;
    job: DealJob | null;
    /** Cards landed per seat during the current job */
    shown: Record<PlayerId, number>;
    /** My card ids last shown while idle (used to hold back early PRIVATE_CARDS) */
    lastShownIds: string[];
}

/** Phases between the first and second deal of a hand */
const MID_HAND: ReadonlySet<GamePhase> = new Set(['VAKKAI_DECISION', 'HUKUM_SELECTION', 'DEALING_SECOND']);
/** Phases where no deal can be running */
const NO_DEAL: ReadonlySet<GamePhase> = new Set(['WAITING_FOR_PLAYERS', 'READY_CHECK', 'HAND_END', 'MATCH_END']);

const STAGE_ORDER: readonly DealStage[] = ['IDLE', 'DECK_ENTERING', 'SHUFFLING', 'SHUFFLE_COMPLETE', 'DEALING', 'DEAL_COMPLETE', 'READY'];

const ACTIVE_STAGES: ReadonlySet<DealStage> = new Set(['DECK_ENTERING', 'SHUFFLING', 'SHUFFLE_COMPLETE', 'DEALING']);

/** Upper bound for one deal before the watchdog forces the table ready */
function watchdogMs(job: DealJob): number {
    const cards = job.order.reduce((n, id) => n + Math.max(0, (job.targets[id] ?? 0) - (job.start[id] ?? 0)), 0);
    const intro = job.reduced ? 0.3 : job.shuffle ? 2.4 : 0.5;
    return (intro + cards * 0.12 + 1) * 1000 + 2500;
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export class DealDirector {
    private snap: DealSnapshot = { stage: 'IDLE', job: null, shown: {}, lastShownIds: [] };
    private listeners = new Set<() => void>();
    private prev: { phase: GamePhase; total: number; counts: Record<PlayerId, number> } | null = null;
    private latest: { myCards: Card[]; myCount: number } = { myCards: [], myCount: 0 };
    private heldIds: string[] = [];
    private nextId = 1;
    private watchdog: ReturnType<typeof setTimeout> | null = null;

    // ---- external store API (stable references for useSyncExternalStore) ----

    subscribe = (fn: () => void) => {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    };

    getSnapshot = (): DealSnapshot => this.snap;

    private set(patch: Partial<DealSnapshot>) {
        this.snap = { ...this.snap, ...patch };
        this.listeners.forEach(fn => fn());
    }

    // ---- input from the game ----

    /** Call after every change to public state or my cards. Idempotent for repeated identical state. */
    observe(state: PublicGameState, myCards: Card[], myId: PlayerId) {
        const counts: Record<PlayerId, number> = {};
        let total = 0;
        for (const p of state.players) {
            counts[p.id] = p.cardCount;
            total += p.cardCount;
        }
        const myCount = counts[myId] ?? 0;
        this.latest = { myCards, myCount };
        // The first half of my hand, as soon as public state and my cards agree on it.
        // (PRIVATE_CARDS for the second half can arrive before or after the public state.)
        if (MID_HAND.has(state.phase) && myCards.length === myCount) this.heldIds = myCards.map(c => c.id);

        const prev = this.prev;
        this.prev = { phase: state.phase, total, counts };

        if (NO_DEAL.has(state.phase)) {
            if (this.snap.job) this.finish();
            this.rememberIdleHand(state.phase);
            return;
        }

        // First state we ever see (e.g. reconnect mid-hand): show it as-is, never replay a deal
        if (!prev || state.players.length !== 4 || total <= prev.total) {
            this.rememberIdleHand(state.phase);
            return;
        }

        const newHand = !MID_HAND.has(prev.phase);
        const job = this.snap.job;

        // Second half arrived while the first is still being dealt: keep dealing from the same deck
        if (job && !newHand && ACTIVE_STAGES.has(this.snap.stage)) {
            this.set({ job: { ...job, targets: counts } });
            this.armWatchdog();
            return;
        }
        if (job) this.finish();

        if (typeof document !== 'undefined' && document.hidden) {
            // Background tab: animations would stall, so just show the result
            this.rememberIdleHand(state.phase);
            return;
        }

        const order = [...state.players].sort((a, b) => a.seat - b.seat).map(p => p.id);
        const start: Record<PlayerId, number> = {};
        for (const id of order) start[id] = newHand ? 0 : Math.min(prev.counts[id] ?? 0, counts[id]);

        const next: DealJob = {
            id: this.nextId++,
            shuffle: newHand,
            reduced: prefersReducedMotion(),
            order,
            start,
            targets: counts,
            baseIds: newHand ? [] : this.heldIds,
        };
        this.set({ job: next, stage: 'DECK_ENTERING', shown: { ...start } });
        this.armWatchdog();
    }

    private rememberIdleHand(phase: GamePhase) {
        if (this.snap.job) return;
        const { myCards, myCount } = this.latest;
        // Only trust my cards once public state has caught up with them
        if (myCards.length > myCount || phase === 'HAND_END') return;
        const ids = myCards.map(c => c.id);
        const same = ids.length === this.snap.lastShownIds.length && ids.every((id, i) => id === this.snap.lastShownIds[i]);
        if (!same) this.set({ lastShownIds: ids });
    }

    // ---- input from the animator ----

    currentJob(id: number): DealJob | null {
        return this.snap.job?.id === id ? this.snap.job : null;
    }

    setStage(id: number, stage: DealStage) {
        if (this.snap.job?.id !== id || this.snap.stage === stage) return;
        // Stages only move forward within a job
        if (STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(this.snap.stage)) return;
        this.set({ stage });
    }

    land(id: number, playerId: PlayerId) {
        const job = this.snap.job;
        if (job?.id !== id) return;
        const n = (this.snap.shown[playerId] ?? 0) + 1;
        this.set({ shown: { ...this.snap.shown, [playerId]: Math.min(n, job.targets[playerId] ?? n) } });
    }

    /** End the current job (normal completion, watchdog, phase change or tab hidden). */
    finish(id?: number) {
        if (!this.snap.job || (id !== undefined && this.snap.job.id !== id)) return;
        this.clearWatchdog();
        const { myCards, myCount } = this.latest;
        const lastShownIds = myCards.length <= myCount ? myCards.map(c => c.id) : this.snap.lastShownIds;
        this.set({ job: null, stage: 'READY', shown: {}, lastShownIds });
    }

    private armWatchdog() {
        this.clearWatchdog();
        const job = this.snap.job;
        if (!job) return;
        this.watchdog = setTimeout(() => this.finish(job.id), watchdogMs(job));
    }

    private clearWatchdog() {
        if (this.watchdog) clearTimeout(this.watchdog);
        this.watchdog = null;
    }

    dispose() {
        this.clearWatchdog();
    }
}

// ============================================
// Pure selectors used during render
// ============================================

/** My cards as they should appear right now (never more than the server sent). */
export function selectHand(snap: DealSnapshot, myCards: Card[], myId: PlayerId, myCount: number, phase: GamePhase): Card[] {
    const job = snap.job;
    if (job) {
        const want = snap.shown[myId] ?? 0;
        // Cards I already held stay put; newly landed ones join in the server's sorted order
        const base = new Set(job.baseIds);
        const picked = new Set(myCards.filter(c => base.has(c.id)).map(c => c.id));
        for (const c of myCards) {
            if (picked.size >= want) break;
            picked.add(c.id);
        }
        return myCards.filter(c => picked.has(c.id));
    }
    if (myCards.length > myCount || phase === 'HAND_END') {
        const keep = new Set(snap.lastShownIds);
        return myCards.filter(c => keep.has(c.id));
    }
    return myCards;
}

/** Face-down cards an opponent's seat should show right now. */
export function selectCount(snap: DealSnapshot, playerId: PlayerId, serverCount: number): number {
    return snap.job ? Math.min(snap.shown[playerId] ?? 0, serverCount) : serverCount;
}
