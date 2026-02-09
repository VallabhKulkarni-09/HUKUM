// ============================================
// HUKUM GAME - CARD COMPONENT
// ============================================

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { Card as CardType } from '../types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../types';
import './Card.css';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    isPlayable?: boolean;
    isSelected?: boolean;
    isInTrick?: boolean;
    delay?: number;
}

export function Card({ card, onClick, isPlayable = false, isSelected = false, isInTrick = false, delay = 0 }: CardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cardRef.current) {
            // Entry animation
            gsap.fromTo(cardRef.current,
                { scale: 0.8, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.4, delay, ease: 'back.out(1.7)' }
            );
        }
    }, [delay]);

    const handleClick = () => {
        if (isPlayable && onClick) {
            // Click animation
            if (cardRef.current) {
                gsap.to(cardRef.current, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                });
            }
            onClick();
        }
    };

    const color = SUIT_COLORS[card.suit];
    const symbol = SUIT_SYMBOLS[card.suit];
    const isRed = card.suit === 'HEART' || card.suit === 'DIAMOND';

    return (
        <div
            ref={cardRef}
            className={`card ${isPlayable ? 'playable' : ''} ${isSelected ? 'selected' : ''} ${isInTrick ? 'in-trick' : ''}`}
            onClick={handleClick}
            style={{ '--card-color': color } as React.CSSProperties}
        >
            <div className="card-inner">
                <div className={`card-corner top-left ${isRed ? 'red' : 'black'}`}>
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit">{symbol}</span>
                </div>
                <div className={`card-center ${isRed ? 'red' : 'black'}`}>
                    <span className="card-symbol">{symbol}</span>
                </div>
                <div className={`card-corner bottom-right ${isRed ? 'red' : 'black'}`}>
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit">{symbol}</span>
                </div>
            </div>
        </div>
    );
}

// Card back component
export function CardBack() {
    return (
        <div className="card card-back">
            <div className="card-back-pattern">
                <span>♠</span><span>♥</span>
                <span>♦</span><span>♣</span>
            </div>
        </div>
    );
}
