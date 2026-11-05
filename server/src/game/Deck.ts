// ============================================
// HUKUM GAME - DECK CLASS
// ============================================

import { Card, Rank, TeamId, SUITS, RANKS } from '../types.js';
import { createCard } from './Card.js';

/**
 * Generate a full 32-card deck
 */
export function createDeck(): Card[] {
    const deck: Card[] = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(createCard(suit, rank));
        }
    }

    return deck;
}

/**
 * Seeded random number generator (for reproducible shuffles)
 */
function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
}

/**
 * Fisher-Yates shuffle with optional seed
 */
export function shuffleDeck(deck: Card[], seed?: number): Card[] {
    const shuffled = [...deck];
    const random = seed !== undefined ? seededRandom(seed) : Math.random;

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Deal cards to players
 * @param deck The deck to deal from
 * @param numPlayers Number of players
 * @param cardsPerPlayer Cards to give each player
 * @returns Array of hands (one per player) and remaining deck
 */
export function dealCards(
    deck: Card[],
    numPlayers: number,
    cardsPerPlayer: number
): { hands: Card[][]; remaining: Card[] } {
    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    let cardIndex = 0;

    // Deal clockwise, one card at a time
    for (let round = 0; round < cardsPerPlayer; round++) {
        for (let player = 0; player < numPlayers; player++) {
            if (cardIndex < deck.length) {
                hands[player].push(deck[cardIndex]);
                cardIndex++;
            }
        }
    }

    return {
        hands,
        remaining: deck.slice(cardIndex),
    };
}

/** Toss value of a card: A=8, K=7, Q=6, J=5, 10=4, 9=3, 8=2, 7=1 (suits don't count) */
export const TOSS_POINTS: Record<Rank, number> = {
    'A': 8, 'K': 7, 'Q': 6, 'J': 5,
    '10': 4, '9': 3, '8': 2, '7': 1,
};

/**
 * Lay out a freshly shuffled toss spread of `slots` face-down cards.
 */
export function createTossSpread(slots: number): Card[] {
    return shuffleDeck(createDeck()).slice(0, slots);
}

/**
 * Add up each team's toss cards. The lower total deals; equal totals mean draw again.
 */
export function scoreToss(picks: { team: TeamId; card: Card }[]): { totals: Record<TeamId, number>; result: TeamId | 'TIE' } {
    const totals: Record<TeamId, number> = { A: 0, B: 0 };
    for (const p of picks) totals[p.team] += TOSS_POINTS[p.card.rank];
    const result = totals.A === totals.B ? 'TIE' : totals.A < totals.B ? 'A' : 'B';
    return { totals, result };
}
