// ============================================
// HUKUM GAME - TRICK LOGIC
// ============================================

import { Card, Suit, TrickCard, TrickState, PlayerId } from '../types.js';
import { compareCards, validateCardPlay } from './Card.js';

/**
 * Create an empty trick state
 */
export function createTrickState(): TrickState {
    return {
        cards: [],
        leadSuit: null,
        winnerId: null,
    };
}

/**
 * Add a card to the current trick
 */
export function addCardToTrick(
    trick: TrickState,
    playerId: PlayerId,
    card: Card
): TrickState {
    const newCards = [...trick.cards, { playerId, card }];
    const leadSuit = trick.leadSuit ?? card.suit;

    return {
        cards: newCards,
        leadSuit,
        winnerId: null, // Will be calculated when trick is complete
    };
}

/**
 * Calculate trick winner
 */
export function calculateTrickWinner(
    trick: TrickState,
    trumpSuit: Suit | null
): PlayerId | null {
    if (trick.cards.length === 0) return null;

    const leadSuit = trick.leadSuit!;

    // Separate trump cards and lead suit cards
    const trumpCards = trumpSuit
        ? trick.cards.filter(c => c.card.suit === trumpSuit)
        : [];

    const leadSuitCards = trick.cards.filter(c => c.card.suit === leadSuit);

    // If any trump was played, highest trump wins
    if (trumpCards.length > 0) {
        const winner = trumpCards.reduce((highest, current) =>
            compareCards(current.card, highest.card) > 0 ? current : highest
        );
        return winner.playerId;
    }

    // Otherwise, highest of lead suit wins
    const winner = leadSuitCards.reduce((highest, current) =>
        compareCards(current.card, highest.card) > 0 ? current : highest
    );
    return winner.playerId;
}

/**
 * Check if a trick is complete (4 cards played in normal, 3 in Vakkai)
 */
export function isTrickComplete(trick: TrickState, isVakkai: boolean): boolean {
    const requiredCards = isVakkai ? 3 : 4;
    return trick.cards.length >= requiredCards;
}

/**
 * Validate a card play for the current trick
 */
export function validateTrickPlay(
    card: Card,
    playerHand: Card[],
    currentTrick: TrickState
): true | string {
    return validateCardPlay(card, playerHand, currentTrick.leadSuit);
}

/**
 * Get the next player in turn order
 * For normal play: clockwise from current
 * For Vakkai: skip partner
 */
export function getNextPlayer(
    currentSeat: number,
    isVakkai: boolean,
    vakkaiDeclarerSeat?: number
): number {
    if (!isVakkai) {
        // Normal clockwise rotation
        return (currentSeat + 1) % 4;
    }

    // Vakkai: skip the partner of declarer
    // Partner seats: 0↔2, 1↔3
    const partnerSeat = (vakkaiDeclarerSeat! + 2) % 4;
    let nextSeat = (currentSeat + 1) % 4;

    if (nextSeat === partnerSeat) {
        nextSeat = (nextSeat + 1) % 4;
    }

    return nextSeat;
}

/**
 * Get turn order for a trick
 * @param leaderSeat - Seat of the player who leads the trick
 * @param isVakkai - Whether this is Vakkai mode
 * @param vakkaiDeclarerSeat - Seat of Vakkai declarer (if applicable)
 */
export function getTrickTurnOrder(
    leaderSeat: number,
    isVakkai: boolean,
    vakkaiDeclarerSeat?: number
): number[] {
    if (!isVakkai) {
        // Normal: 4 players clockwise
        return [0, 1, 2, 3].map(i => (leaderSeat + i) % 4);
    }

    // Vakkai: declarer leads, then 2 opponents
    const partnerSeat = (vakkaiDeclarerSeat! + 2) % 4;
    const order: number[] = [vakkaiDeclarerSeat!];

    for (let i = 1; i <= 3; i++) {
        const seat = (vakkaiDeclarerSeat! + i) % 4;
        if (seat !== partnerSeat) {
            order.push(seat);
        }
    }

    return order;
}
