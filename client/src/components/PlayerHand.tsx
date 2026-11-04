// ============================================
// HUKUM - PLAYER HAND (curved fan)
// Touch: tap to raise a card, tap it again to play.
// Mouse: click plays straight away.
// ============================================

import { useState } from 'react';
import type { Card, Suit } from '../types';
import { PlayingCard } from './cards/PlayingCard';
import { getPlayableIds, hasFinePointer } from '../gameUtils';
import './PlayerHand.css';

interface PlayerHandProps {
    cards: Card[];
    /** It's my turn in a trick */
    canPlay: boolean;
    leadSuit: Suit | null;
    /** Partner of the Vakkai declarer: hand is out of play */
    isSittingOut?: boolean;
    onPlayCard: (cardId: string) => void;
    onSelectionChange?: (card: Card | null) => void;
}

export function PlayerHand({ cards, canPlay, leadSuit, isSittingOut = false, onPlayCard, onSelectionChange }: PlayerHandProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const playable = canPlay ? getPlayableIds(cards, leadSuit) : new Set<string>();

    // A selection only counts while it's still a legal play
    const active = selectedId && playable.has(selectedId) ? selectedId : null;

    const select = (card: Card | null) => {
        setSelectedId(card?.id ?? null);
        onSelectionChange?.(card);
    };

    const handleTap = (card: Card) => {
        if (hasFinePointer() || active === card.id) {
            select(null);
            onPlayCard(card.id);
        } else {
            select(card);
        }
    };

    const n = cards.length;
    const mid = (n - 1) / 2;

    return (
        <div
            className={`hand ${n <= 4 ? 'few' : ''} ${canPlay ? 'active' : ''} ${isSittingOut ? 'sitting-out' : ''}`}
            role="group"
            aria-label={canPlay ? 'Your hand, choose a card' : 'Your hand'}
        >
            {cards.map((card, i) => (
                <div
                    key={card.id}
                    className="hand-slot"
                    style={{ '--i': i - mid, '--abs': Math.abs(i - mid) } as React.CSSProperties}
                >
                    <PlayingCard
                        card={card}
                        isPlayable={playable.has(card.id)}
                        isDisabled={canPlay && !playable.has(card.id)}
                        isSelected={active === card.id}
                        onClick={() => handleTap(card)}
                    />
                </div>
            ))}
        </div>
    );
}
