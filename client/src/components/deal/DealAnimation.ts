// ============================================
// HUKUM - DEAL SEQUENCE
// Deals one card at a time in server seat order (seat 0,1,2,3, repeat),
// which is exactly how the server's dealCards() hands them out.
// Targets are read live from the director, so if the second half of
// the hand arrives mid-deal the loop simply keeps going.
// ============================================

import gsap from 'gsap';
import type { PlayerId } from '../../types';
import type { DealDirector, DealJob } from './DealDirector';
import { STACK_SIZE } from './DeckStack';
import type { DeckRefs } from './deckElements';
import { cardFlight, FLIGHT, measureTarget } from './CardFlight';
import { restX, restY } from './ShuffleAnimation';
import { playSound } from '../../audio/soundManager';

const DECK_SIZE = 32;

/** Next seat to receive a card: fewest launched so far, ties in seat order */
function nextRecipient(job: DealJob, launched: Record<PlayerId, number>): PlayerId | null {
    let best: PlayerId | null = null;
    for (const id of job.order) {
        if ((launched[id] ?? 0) >= (job.targets[id] ?? 0)) continue;
        if (best === null || launched[id] < launched[best]) best = id;
    }
    return best;
}

/** Stack cards to show for the cards still in the deck */
export const stackFor = (remaining: number) =>
    remaining <= 0 ? 0 : Math.max(1, Math.min(STACK_SIZE, Math.ceil((remaining / DECK_SIZE) * STACK_SIZE)));

export const remainingAtStart = (job: DealJob) =>
    DECK_SIZE - job.order.reduce((n, id) => n + (job.start[id] ?? 0), 0);

interface DealOptions {
    ctx: gsap.Context;
    deck: DeckRefs;
    table: HTMLElement;
    layer: HTMLElement;
    director: DealDirector;
    jobId: number;
    myId: PlayerId;
    deckCenter: { x: number; y: number };
    onDone: () => void;
}

/** Start dealing. Returns nothing; everything it creates is recorded in `ctx` for cleanup. */
export function runDeal(o: DealOptions) {
    const job0 = o.director.currentJob(o.jobId);
    if (!job0) return;
    const launched: Record<PlayerId, number> = { ...job0.start };
    let remaining = remainingAtStart(job0);
    let inFlight = 0;
    let seq = 0;
    let idle = false;
    let ended = false;
    const deckW = o.deck.cards[0]?.offsetWidth || 60;
    const handW = o.deck.probe?.offsetWidth || deckW;

    const updateStack = () => {
        const v = stackFor(remaining);
        o.deck.cards.forEach((c, i) => gsap.set(c, { autoAlpha: i < v ? 1 : 0 }));
    };

    const finish = () => {
        if (ended) return;
        ended = true;
        o.onDone();
    };

    const launchReduced = (job: DealJob) => {
        // Reduced motion: whole rounds appear together, no flights
        let any = false;
        for (const id of job.order) {
            if ((launched[id] ?? 0) < (job.targets[id] ?? 0)) {
                launched[id]++;
                remaining--;
                o.director.land(o.jobId, id);
                any = true;
            }
        }
        updateStack();
        return any;
    };

    const step = () => {
        if (ended) return;
        const job = o.director.currentJob(o.jobId);
        if (!job) return finish();

        if (job.reduced) {
            if (launchReduced(job)) o.ctx.add(() => gsap.delayedCall(0.12, step));
            else finish();
            return;
        }

        const rec = nextRecipient(job, launched);
        if (!rec) {
            idle = true;
            if (inFlight === 0) finish();
            return;
        }
        idle = false;

        const index = launched[rec]++;
        const total = job.targets[rec] ?? index + 1;
        const v = stackFor(remaining);
        remaining--;
        updateStack();

        const layerRect = o.layer.getBoundingClientRect();
        const top = Math.max(0, v - 1);
        const from = { x: o.deckCenter.x + restX(top), y: o.deckCenter.y + restY(top) };
        const to = measureTarget(o.table, layerRect, rec, o.myId, index, total, deckW, handW);
        const el = o.deck.flights[seq % o.deck.flights.length];
        const n = seq++;
        inFlight++;

        o.ctx.add(() => {
            cardFlight(el, from, to, n, () => {
                inFlight--;
                o.director.land(o.jobId, rec);
                playSound('cardDeal');
                // Loop went idle while cards were still flying: check for more (or finish)
                if (idle && inFlight === 0) step();
            });
            // Both halves of a hand queued up (bots decided fast): deal a little quicker
            const pending = job.order.reduce((s, id) => s + Math.max(0, (job.targets[id] ?? 0) - (launched[id] ?? 0)), 0);
            gsap.delayedCall(pending > 12 ? FLIGHT.stagger * 0.75 : FLIGHT.stagger, step);
        });
    };

    step();
}
