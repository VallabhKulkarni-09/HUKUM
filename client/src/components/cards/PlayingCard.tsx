// ============================================
// HUKUM - PLAYING CARD, CARD BACK, CARD FAN
// Original card art: corner indices, large suit centre,
// illustrated crests on court cards and aces.
// ============================================

import { memo } from 'react';
import type { Card, Rank, Suit } from '../../types';
import { SuitIcon } from './SuitIcon';
import { SUIT_LABEL } from './suitLabels';
import './cards.css';

const RANK_LABEL: Record<Rank, string> = {
    A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', '10': '10', '9': '9', '8': '8', '7': '7',
};

const isRed = (s: Suit) => s === 'HEART' || s === 'DIAMOND';

interface PlayingCardProps {
    card: Card;
    onClick?: () => void;
    isPlayable?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    /** Smaller size used on the table */
    isInTrick?: boolean;
    /** Highlight as the winning card of a full trick */
    isWinner?: boolean;
}

export const PlayingCard = memo(function PlayingCard({
    card,
    onClick,
    isPlayable = false,
    isSelected = false,
    isDisabled = false,
    isInTrick = false,
    isWinner = false,
}: PlayingCardProps) {
    // Dealing (flight + flip-open) is handled by components/deal; this stays a plain card.
    const classes = [
        'pcard',
        isRed(card.suit) ? 'red' : 'black',
        isInTrick ? 'in-trick' : '',
        isPlayable ? 'playable' : '',
        isSelected ? 'selected' : '',
        isDisabled ? 'disabled' : '',
        isWinner ? 'winner' : '',
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={classes}
            onClick={isPlayable ? onClick : undefined}
            aria-label={`${RANK_LABEL[card.rank]} of ${SUIT_LABEL[card.suit]}${isDisabled ? ', cannot play' : ''}`}
            aria-pressed={isSelected || undefined}
            aria-disabled={!isPlayable || undefined}
            tabIndex={isPlayable ? 0 : -1}
        >
            <span className="pcard-frame" />
            <span className="pcard-index">
                <span className="pcard-rank">{card.rank}</span>
                <SuitIcon suit={card.suit} className="pcard-index-suit" />
            </span>
            <span className="pcard-index flip">
                <span className="pcard-rank">{card.rank}</span>
                <SuitIcon suit={card.suit} className="pcard-index-suit" />
            </span>
            <CardCentre rank={card.rank} suit={card.suit} />
        </button>
    );
});

/** Centre artwork: big suit for numbers, crest for aces and court cards */
function CardCentre({ rank, suit }: { rank: Rank; suit: Suit }) {
    if (rank === 'A') {
        return (
            <span className="pcard-centre ace">
                <svg viewBox="0 0 100 100" className="pcard-ace-ring" aria-hidden>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" opacity=".55" />
                    <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="2" opacity=".35" />
                </svg>
                <SuitIcon suit={suit} className="pcard-ace-suit" />
            </span>
        );
    }

    if (rank === 'K' || rank === 'Q' || rank === 'J') {
        return (
            <span className={`pcard-centre court ${isRed(suit) ? 'court-red' : 'court-blue'}`}>
                <CourtCrest rank={rank} />
                <SuitIcon suit={suit} className="pcard-court-suit" />
            </span>
        );
    }

    return (
        <span className="pcard-centre">
            <SuitIcon suit={suit} className="pcard-pip" />
        </span>
    );
}

/** Original crest per court rank: crown (K), tiara (Q), plumed cap (J) */
function CourtCrest({ rank }: { rank: 'K' | 'Q' | 'J' }) {
    const ink = 'var(--ink)';
    if (rank === 'K') {
        return (
            <svg viewBox="0 0 60 40" className="pcard-crest" aria-hidden>
                <path d="M6 34 4 10l13 10 13-16 13 16 13-10-2 24z" fill="#ffcb22" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
                <rect x="6" y="31" width="48" height="6" rx="2" fill="#f28a18" stroke={ink} strokeWidth="3" />
                <circle cx="30" cy="22" r="3.6" fill="#e94359" stroke={ink} strokeWidth="2" />
                <circle cx="4" cy="9" r="3" fill="#fff" stroke={ink} strokeWidth="2" />
                <circle cx="30" cy="4" r="3" fill="#fff" stroke={ink} strokeWidth="2" />
                <circle cx="56" cy="9" r="3" fill="#fff" stroke={ink} strokeWidth="2" />
            </svg>
        );
    }
    if (rank === 'Q') {
        return (
            <svg viewBox="0 0 60 40" className="pcard-crest" aria-hidden>
                <path d="M7 33c2-9 0-15-3-21 7 3 11 6 13 11 3-8 7-13 13-18 6 5 10 10 13 18 2-5 6-8 13-11-3 6-5 12-3 21z" fill="#ffcb22" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
                <rect x="7" y="30" width="46" height="6" rx="3" fill="#79d1f0" stroke={ink} strokeWidth="3" />
                <path d="M30 13l4 6-4 6-4-6z" fill="#e94359" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 60 40" className="pcard-crest" aria-hidden>
            <path d="M8 34c0-12 9-20 22-20s22 8 22 20z" fill="#317fc5" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
            <path d="M30 15C34 7 42 2 52 3c-4 3-7 7-8 12" fill="#76e323" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
            <rect x="6" y="31" width="48" height="6" rx="3" fill="#ffcb22" stroke={ink} strokeWidth="3" />
            <circle cx="30" cy="24" r="3.4" fill="#fff" stroke={ink} strokeWidth="2" />
        </svg>
    );
}

// ============================================
// CARD BACK
// ============================================

export function CardBack({ className = '' }: { className?: string }) {
    return (
        <span className={`pcard-back ${className}`} aria-hidden>
            <span className="pcard-back-inner">
                <svg viewBox="0 0 40 56" className="pcard-back-art">
                    <defs>
                        <pattern id="hk-diamonds" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width="8" height="8" fill="#1b5ea6" />
                            <rect width="4" height="4" fill="#206ab5" />
                        </pattern>
                    </defs>
                    <rect width="40" height="56" fill="url(#hk-diamonds)" />
                    <ellipse cx="20" cy="28" rx="15" ry="20" fill="#ffcb22" stroke="#17365c" strokeWidth="2" />
                    <path d="M20 14c3 5 10 8 10 14 0 3.6-2.6 5.6-5.4 5.6-1.7 0-3.2-.8-4-2 .3 2 1.3 3.6 3.2 4.6h-7.6c1.9-1 2.9-2.6 3.2-4.6-.8 1.2-2.3 2-4 2C12.6 33.6 10 31.6 10 28c0-6 7-9 10-14z" fill="#17365c" />
                </svg>
            </span>
        </span>
    );
}

// ============================================
// CARD FAN (opponent's face-down hand)
// ============================================

interface CardFanProps {
    count: number;
    direction?: 'horizontal' | 'vertical';
    className?: string;
}

export function CardFan({ count, direction = 'horizontal', className = '' }: CardFanProps) {
    if (count <= 0) return null;
    const mid = (count - 1) / 2;
    return (
        <span className={`card-fan ${direction} ${className}`} aria-label={`${count} cards`} role="img">
            {Array.from({ length: count }).map((_, i) => (
                <span key={i} className="card-fan-slot" style={{ '--i': i - mid } as React.CSSProperties}>
                    <CardBack />
                </span>
            ))}
        </span>
    );
}
