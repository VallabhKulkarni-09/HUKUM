// ============================================
// HUKUM GAME - ACTION BUTTONS COMPONENT
// ============================================

import type { Suit, GamePhase } from '../types';
import { SUIT_SYMBOLS } from '../types';
import './ActionButtons.css';

interface ActionButtonsProps {
    phase: GamePhase;
    isMyTurn: boolean;
    isTrumpChooser: boolean;
    onPassVakkai: () => void;
    onDeclareVakkai: () => void;
    onChooseHukum: (suit: Suit) => void;
}

export function ActionButtons({
    phase,
    isMyTurn,
    isTrumpChooser,
    onPassVakkai,
    onDeclareVakkai,
    onChooseHukum,
}: ActionButtonsProps) {
    // Vakkai decision phase
    if (phase === 'VAKKAI_DECISION' && isMyTurn) {
        return (
            <div className="action-buttons vakkai-actions">
                <h3>Vakkai Decision</h3>
                <p>Win 4 consecutive tricks alone for +8, or fail for -16</p>
                <div className="button-group">
                    <button className="action-btn danger" onClick={onDeclareVakkai}>
                        Declare Vakkai ⚡
                    </button>
                    <button className="action-btn secondary" onClick={onPassVakkai}>
                        Pass
                    </button>
                </div>
            </div>
        );
    }

    // Hukum selection phase
    if (phase === 'HUKUM_SELECTION' && isTrumpChooser) {
        return (
            <div className="action-buttons hukum-actions">
                <h3>Choose Trump Suit (Hukum)</h3>
                <div className="suit-buttons">
                    <button
                        className="suit-btn spade"
                        onClick={() => onChooseHukum('SPADE')}
                    >
                        {SUIT_SYMBOLS.SPADE} Spade
                    </button>
                    <button
                        className="suit-btn heart"
                        onClick={() => onChooseHukum('HEART')}
                    >
                        {SUIT_SYMBOLS.HEART} Heart
                    </button>
                    <button
                        className="suit-btn diamond"
                        onClick={() => onChooseHukum('DIAMOND')}
                    >
                        {SUIT_SYMBOLS.DIAMOND} Diamond
                    </button>
                    <button
                        className="suit-btn club"
                        onClick={() => onChooseHukum('CLUB')}
                    >
                        {SUIT_SYMBOLS.CLUB} Club
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
