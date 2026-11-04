// ============================================
// HUKUM - DECISION PANELS (Vakkai / Hukum)
// Shown in the middle of the table (the trick area is empty at this point),
// so the player's hand stays fully visible.
// ============================================

import type { Suit, GamePhase, Card } from '../types';
import { SUITS } from '../types';
import { SuitIcon } from './cards/SuitIcon';
import { SUIT_LABEL } from './cards/suitLabels';
import { BoltIcon } from './ui/Icons';
import './ActionButtons.css';

interface ActionButtonsProps {
    phase: GamePhase;
    isMyTurn: boolean;
    isTrumpChooser: boolean;
    myCards: Card[];
    onPassVakkai: () => void;
    onDeclareVakkai: () => void;
    onChooseHukum: (suit: Suit) => void;
}

export function ActionButtons({
    phase,
    isMyTurn,
    isTrumpChooser,
    myCards,
    onPassVakkai,
    onDeclareVakkai,
    onChooseHukum,
}: ActionButtonsProps) {
    if (phase === 'VAKKAI_DECISION' && isMyTurn) {
        return (
            <section className="decision vakkai" role="dialog" aria-label="Vakkai decision">
                <div className="decision-head">
                    <BoltIcon className="decision-burst" width={34} height={34} />
                    <h3 className="display display-lg">Vakkai?</h3>
                </div>
                <p className="decision-text">Win <b>4 tricks in a row</b> on your own, with no trump.</p>
                <div className="decision-stakes">
                    <span className="stake win">Win <b>+8</b></span>
                    <span className="stake lose">Lose <b>−16</b></span>
                </div>
                <div className="decision-buttons">
                    <button type="button" className="btn btn-blue" onClick={onPassVakkai}>
                        <span>Pass</span>
                    </button>
                    <button type="button" className="btn btn-orange" onClick={onDeclareVakkai}>
                        <span>Declare!</span>
                    </button>
                </div>
            </section>
        );
    }

    if (phase === 'HUKUM_SELECTION' && isTrumpChooser) {
        return (
            <section className="decision hukum" role="dialog" aria-label="Choose Hukum">
                <div className="decision-head">
                    <h3 className="display display-lg">Choose Hukum</h3>
                </div>
                <p className="decision-text">Pick the trump suit for this hand.</p>
                <div className="suit-grid">
                    {SUITS.map(suit => {
                        const count = myCards.filter(c => c.suit === suit).length;
                        return (
                            <button
                                key={suit}
                                type="button"
                                className="suit-tile"
                                onClick={() => onChooseHukum(suit)}
                                aria-label={`${SUIT_LABEL[suit]}, ${count} in hand`}
                            >
                                <SuitIcon suit={suit} className="suit-tile-icon" />
                                <span className="suit-tile-count">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        );
    }

    return null;
}
