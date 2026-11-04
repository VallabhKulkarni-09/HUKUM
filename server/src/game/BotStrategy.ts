// ============================================
// HUKUM GAME - BOT STRATEGY
// ============================================
// Pure decision functions for server-controlled players.
// Bots only see their own hand and the current trick, same as a human.

import { Card, Suit, TeamId, TrickState, PlayerId, RANKS, RANK_VALUES } from '../types.js';
import { calculateTrickWinner } from './TrickLogic.js';
import { isVakkaiEligible } from './Card.js';

const byRankAsc = (a: Card, b: Card) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
const lowest = (cards: Card[]) => [...cards].sort(byRankAsc)[0];
const highest = (cards: Card[]) => [...cards].sort(byRankAsc)[cards.length - 1];

/**
 * Declare Vakkai only when it is allowed (3 cards of one suit + 1 of another)
 * and the 4 cards are guaranteed to win: in each suit held, the cards must be
 * an unbroken run from the Ace down (e.g. A-K-Q of hearts + A of spades).
 * With no trump and the declarer leading every trick, such a hand cannot lose.
 */
export function shouldDeclareVakkai(hand: Card[]): boolean {
    if (!isVakkaiEligible(hand)) return false;

    const bySuit = new Map<Suit, Card[]>();
    for (const c of hand) {
        bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c]);
    }

    for (const cards of bySuit.values()) {
        const held = new Set(cards.map(c => c.rank));
        // RANKS is ordered high → low, so the first N ranks must all be held
        for (let i = 0; i < cards.length; i++) {
            if (!held.has(RANKS[i])) return false;
        }
    }
    return true;
}

/**
 * Pick the suit with the most cards in the first 4; break ties by total rank strength.
 */
export function chooseTrumpSuit(hand: Card[]): Suit {
    const scores = new Map<Suit, number>();
    for (const c of hand) {
        scores.set(c.suit, (scores.get(c.suit) ?? 0) + 10 + RANK_VALUES[c.rank]);
    }

    let best: Suit = hand[0]?.suit ?? 'SPADE';
    let bestScore = -1;
    for (const [suit, score] of scores) {
        if (score > bestScore) {
            best = suit;
            bestScore = score;
        }
    }
    return best;
}

/**
 * Choose a card to play. Assumes `validCards` already respects follow-suit.
 */
export function chooseCard(params: {
    validCards: Card[];
    trick: TrickState;
    trumpSuit: Suit | null;
    myTeam: TeamId;
    teamOf: (playerId: PlayerId) => TeamId | undefined;
}): Card {
    const { validCards, trick, trumpSuit, myTeam, teamOf } = params;
    if (validCards.length === 1) return validCards[0];

    const isTrump = (c: Card) => trumpSuit !== null && c.suit === trumpSuit;
    const nonTrump = validCards.filter(c => !isTrump(c));
    const trumps = validCards.filter(isTrump);

    // --- Leading the trick ---
    if (trick.cards.length === 0) {
        // Lead a non-trump Ace if we have one (likely winner)
        const ace = nonTrump.find(c => c.rank === 'A');
        if (ace) return ace;
        // Otherwise lead low to keep strong cards
        if (nonTrump.length > 0) return lowest(nonTrump);
        // Only trumps left: lead the strongest
        return highest(trumps);
    }

    // --- Following ---
    const winnerId = calculateTrickWinner(trick, trumpSuit)!;
    const winningCard = trick.cards.find(tc => tc.playerId === winnerId)!.card;
    const partnerWinning = teamOf(winnerId) === myTeam;

    const beats = (c: Card): boolean => {
        if (isTrump(c) && !isTrump(winningCard)) return true;
        if (c.suit !== winningCard.suit) return false;
        return RANK_VALUES[c.rank] > RANK_VALUES[winningCard.rank];
    };

    const followingSuit = validCards.some(c => c.suit === trick.leadSuit);

    // Partner already has it: throw away the cheapest card
    if (partnerWinning) {
        if (followingSuit) return lowest(validCards);
        return nonTrump.length > 0 ? lowest(nonTrump) : lowest(validCards);
    }

    // Opponent winning: win as cheaply as possible
    const winners = validCards.filter(beats);
    if (winners.length > 0) {
        // Prefer winning without spending a trump
        const nonTrumpWinners = winners.filter(c => !isTrump(c));
        return nonTrumpWinners.length > 0 ? lowest(nonTrumpWinners) : lowest(winners);
    }

    // Can't win: discard the cheapest non-trump if possible
    return nonTrump.length > 0 ? lowest(nonTrump) : lowest(validCards);
}
