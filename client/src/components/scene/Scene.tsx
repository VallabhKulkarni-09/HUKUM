// ============================================
// HUKUM - SCENE ART (backgrounds, logo, table, loader)
// All original CSS/SVG artwork, no image assets.
// ============================================

import type { Suit } from '../../types';
import { SuitIcon } from '../cards/SuitIcon';
import './scene.css';

/** Bright blue lobby sky with sunburst and drifting suits */
export function LobbyBackground() {
    const floaters: { suit: Suit; x: string; y: string; s: number; r: number; d: number }[] = [
        { suit: 'SPADE', x: '8%', y: '18%', s: 54, r: -18, d: 0 },
        { suit: 'HEART', x: '86%', y: '14%', s: 46, r: 16, d: 1.2 },
        { suit: 'DIAMOND', x: '12%', y: '74%', s: 40, r: 12, d: 2.1 },
        { suit: 'CLUB', x: '90%', y: '70%', s: 58, r: -10, d: 0.6 },
        { suit: 'HEART', x: '30%', y: '88%', s: 30, r: -22, d: 1.7 },
        { suit: 'SPADE', x: '70%', y: '90%', s: 34, r: 20, d: 2.6 },
    ];
    return (
        <div className="bg-lobby" aria-hidden>
            <div className="bg-rays" />
            <div className="bg-glow" />
            {floaters.map((f, i) => (
                <span
                    key={i}
                    className="bg-floater"
                    style={{ left: f.x, top: f.y, width: f.s, height: f.s, '--r': `${f.r}deg`, animationDelay: `${f.d}s` } as React.CSSProperties}
                >
                    <SuitIcon suit={f.suit} outlined />
                </span>
            ))}
        </div>
    );
}

/** Game room: wooden floor, rug, and a big oval felt table */
export function TableScene({ blurred = false }: { blurred?: boolean }) {
    return (
        <div className={`bg-room ${blurred ? 'blurred' : ''}`} aria-hidden>
            <div className="room-floor" />
            <div className="room-rug" />
            <div className="table-rim">
                <div className="table-felt">
                    <div className="felt-ring" />
                    <div className="felt-emblem">
                        <svg viewBox="0 0 100 100">
                            <path d="M50 5c12 18 43 33 43 56 0 14-11 22-22 22-7 0-13-3-17-8 1 8 5 14 13 18H33c8-4 12-10 13-18-4 5-10 8-17 8-11 0-22-8-22-22C7 38 38 23 50 5z" />
                        </svg>
                        <span>HUKUM</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Hukum wordmark: chunky yellow letters with a crowned spade */
export function Logo({ size = 'lg' }: { size?: 'md' | 'lg' }) {
    return (
        <div className={`logo logo-${size}`} role="img" aria-label="Hukum">
            <svg viewBox="0 0 80 80" className="logo-mark" aria-hidden>
                <path d="M16 26 12 6l14 10 14-14 14 14 14-10-4 20z" fill="#ffcb22" stroke="#17365c" strokeWidth="4" strokeLinejoin="round" />
                <circle cx="40" cy="4" r="4" fill="#fff" stroke="#17365c" strokeWidth="3" />
                <path d="M40 22c9 13 30 23 30 39 0 10-8 15-15.5 15-5 0-9-2-12-5.5.8 5.5 3.5 9.5 9 12.5H28.5c5.5-3 8.2-7 9-12.5-3 3.5-7 5.5-12 5.5C18 76 10 71 10 61c0-16 21-26 30-39z" fill="#17365c" />
                <path d="M40 30c7 10 23 18 23 30 0 6-4 9-8 9" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <span className="logo-word">HUKUM</span>
        </div>
    );
}

/** Bouncing suits loader */
export function Loader({ label }: { label?: string }) {
    return (
        <span className="loader" role="status" aria-label={label ?? 'Loading'}>
            <SuitIcon suit="SPADE" outlined />
            <SuitIcon suit="HEART" outlined />
            <SuitIcon suit="CLUB" outlined />
            <SuitIcon suit="DIAMOND" outlined />
        </span>
    );
}
