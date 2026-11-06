// ============================================
// HUKUM - TRUMP REVEAL STATE
// Tracks this hand's Hukum from "chosen" to "in the medal":
// - Waits while cards are being dealt, so nobody misses the flight.
// - A client that joins / reconnects with Hukum already chosen sees the
//   medal straight away (no replay).
// Presentation only: the game state is never held back.
// ============================================

import { useState } from 'react';
import type { Suit } from '../../types';

/**
 * none: no Hukum yet · pending: chosen, waiting to fly ·
 * landed: just flew in (medal pops) · shown: known from the start (no pop)
 */
type RevealStage = 'none' | 'pending' | 'landed' | 'shown';

export interface HukumReveal {
    /** Suit to show in the medal ('?' until the flight lands) */
    medalSuit: Suit | null;
    /** Suit flying from the table centre to the medal right now */
    flyingSuit: Suit | null;
    /** The medal just received the suit (one-shot pop) */
    landed: boolean;
    /** Players can see the Hukum (flight started or done): H badge and sound */
    announced: boolean;
    /** Call when the flight finishes */
    land: () => void;
}

/** `blocked`: hold the flight (e.g. while cards are being dealt) */
export function useHukumReveal(suit: Suit | null, blocked: boolean): HukumReveal {
    const [seen, setSeen] = useState<{ suit: Suit | null; stage: RevealStage }>(
        () => ({ suit, stage: suit ? 'shown' : 'none' }),
    );

    // Adjust state while rendering when the suit changes (React's "previous prop" pattern)
    let cur = seen;
    if (suit !== seen.suit) {
        cur = { suit, stage: suit ? 'pending' : 'none' };
        setSeen(cur);
    }

    const flying = cur.stage === 'pending' && !blocked;
    const done = cur.stage === 'landed' || cur.stage === 'shown';
    return {
        medalSuit: done ? cur.suit : null,
        flyingSuit: flying ? cur.suit : null,
        landed: cur.stage === 'landed',
        announced: flying || done,
        land: () => setSeen(s => (s.suit === suit && s.stage === 'pending' ? { suit, stage: 'landed' } : s)),
    };
}
