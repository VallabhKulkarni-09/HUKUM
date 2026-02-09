// ============================================
// HUKUM GAME - CARD CLASS
// ============================================

import { Card, Suit, Rank, RANK_VALUES } from '../types.js';

/**
 * Create a card object
 */
export function createCard(suit: Suit, rank: Rank): Card {
    return {
        suit,
        rank,
        id: `${suit}_${rank}`,
    };
}

/**
 * Get the numeric value of a card's rank
 */
export function getCardValue(card: Card): number {
    return RANK_VALUES[card.rank];
}

/**
 * Compare two cards of the same suit
 * Returns positive if card1 > card2, negative if card1 < card2
 */
export function compareCards(card1: Card, card2: Card): number {
    return getCardValue(card1) - getCardValue(card2);
}

/**
 * Determine trick winner given led suit and optional trump suit
 */
export function determineTrickWinner(
    cards: Array<{ playerId: string; card: Card }>,
    trumpSuit: Suit | null
): { playerId: string; card: Card } | null {
    if (cards.length === 0) return null;

    const leadSuit = cards[0].card.suit;

    // Separate trump cards and lead suit cards
    const trumpCards = trumpSuit
        ? cards.filter(c => c.card.suit === trumpSuit)
        : [];

    const leadSuitCards = cards.filter(c => c.card.suit === leadSuit);

    // If any trump was played, highest trump wins
    if (trumpCards.length > 0) {
        return trumpCards.reduce((highest, current) =>
            compareCards(current.card, highest.card) > 0 ? current : highest
        );
    }

    // Otherwise, highest of lead suit wins
    return leadSuitCards.reduce((highest, current) =>
        compareCards(current.card, highest.card) > 0 ? current : highest
    );
}

/**
 * Check if a player can play a specific card
 * Returns true if valid, or error message if invalid
 */
export function validateCardPlay(
    cardToPlay: Card,
    playerHand: Card[],
    leadSuit: Suit | null
): true | string {
    // Check if player has the card
    const hasCard = playerHand.some(c => c.id === cardToPlay.id);
    if (!hasCard) {
        return 'You do not have this card';
    }

    // If no lead suit (first card of trick), any card is valid
    if (leadSuit === null) {
        return true;
    }

    // Check if player has cards of the lead suit
    const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);

    // If player has lead suit cards, must play one
    if (hasLeadSuit && cardToPlay.suit !== leadSuit) {
        return `You must follow suit (${leadSuit})`;
    }

    // If player doesn't have lead suit, any card is valid
    return true;
}

/**
 * Get card display string with Unicode symbol
 */
export function getCardDisplay(card: Card): string {
    const suitSymbols: Record<Suit, string> = {
        'SPADE': '♠',
        'HEART': '♥',
        'DIAMOND': '♦',
        'CLUB': '♣',
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
}
