// ============================================
// HUKUM GAME - DECK CLASS
// ============================================

import { Card, Suit, Rank, SUITS, RANKS } from '../types.js';
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

/**
 * Draw one card for each player (for initial toss)
 */
export function drawTossCards(numPlayers: number): Card[] {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    return shuffled.slice(0, numPlayers);
}

/**
 * Calculate team points from toss cards
 * Team A = players 0, 2 (P1, P3)
 * Team B = players 1, 3 (P2, P4)
 */
export function calculateTossPoints(
    tossCards: Card[]
): { teamA: number; teamB: number } {
    const cardPoints: Record<Rank, number> = {
        'A': 8, 'K': 7, 'Q': 6, 'J': 5,
        '10': 4, '9': 3, '8': 2, '7': 1,
    };

    let teamA = 0;
    let teamB = 0;

    tossCards.forEach((card, index) => {
        const points = cardPoints[card.rank];
        if (index % 2 === 0) {
            teamA += points; // P1, P3
        } else {
            teamB += points; // P2, P4
        }
    });

    return { teamA, teamB };
}
