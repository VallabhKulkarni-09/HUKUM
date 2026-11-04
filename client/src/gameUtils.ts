// ============================================
// HUKUM GAME - CLIENT-SIDE HELPERS
// Display-only mirrors of server rules. The server stays authoritative.
// ============================================

import type { Card, Rank, Suit, TrickState, PlayerId } from './types';

const RANK_VALUE: Record<Rank, number> = {
    A: 8, K: 7, Q: 6, J: 5, '10': 4, '9': 3, '8': 2, '7': 1,
};

export const SUIT_NAMES: Record<Suit, string> = {
    SPADE: 'Spades',
    HEART: 'Hearts',
    DIAMOND: 'Diamonds',
    CLUB: 'Clubs',
};

export const isRedSuit = (suit: Suit) => suit === 'HEART' || suit === 'DIAMOND';

/**
 * IDs of cards the player may play now (follow suit if possible).
 */
export function getPlayableIds(hand: Card[], leadSuit: Suit | null): Set<string> {
    if (!leadSuit) return new Set(hand.map(c => c.id));
    const follow = hand.filter(c => c.suit === leadSuit);
    return new Set((follow.length > 0 ? follow : hand).map(c => c.id));
}

/**
 * Current winner of a (possibly partial) trick.
 */
export function getTrickWinnerId(trick: TrickState, trumpSuit: Suit | null): PlayerId | null {
    if (trick.cards.length === 0 || !trick.leadSuit) return null;

    const trumps = trumpSuit ? trick.cards.filter(c => c.card.suit === trumpSuit) : [];
    const pool = trumps.length > 0 ? trumps : trick.cards.filter(c => c.card.suit === trick.leadSuit);

    return pool.reduce((best, cur) =>
        RANK_VALUE[cur.card.rank] > RANK_VALUE[best.card.rank] ? cur : best
    ).playerId;
}

/**
 * Up to two initials for an avatar.
 */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Format a signed score: +5, −5, 0
 */
export function formatScore(n: number): string {
    if (n > 0) return `+${n}`;
    if (n < 0) return `−${Math.abs(n)}`;
    return '0';
}

/**
 * True on devices with a precise pointer and hover (mouse/trackpad).
 */
export function hasFinePointer(): boolean {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
}
