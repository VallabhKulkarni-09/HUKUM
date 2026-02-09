// ============================================
// HUKUM GAME - PLAYER HAND COMPONENT
// ============================================

import { Card } from './Card';
import type { Card as CardType } from '../types';
import './PlayerHand.css';

interface PlayerHandProps {
    cards: CardType[];
    isMyTurn: boolean;
    onPlayCard: (cardId: string) => void;
    selectedCardId?: string;
}

export function PlayerHand({ cards, isMyTurn, onPlayCard, selectedCardId }: PlayerHandProps) {
    return (
        <div className="player-hand">
            <div className="hand-cards">
                {cards.map((card, index) => (
                    <Card
                        key={card.id}
                        card={card}
                        isPlayable={isMyTurn}
                        isSelected={card.id === selectedCardId}
                        onClick={() => onPlayCard(card.id)}
                        delay={index * 0.05}
                    />
                ))}
            </div>
            {isMyTurn && (
                <div className="turn-indicator">
                    Your Turn - Play a card
                </div>
            )}
        </div>
    );
}
