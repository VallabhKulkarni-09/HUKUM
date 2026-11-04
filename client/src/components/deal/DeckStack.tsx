// ============================================
// HUKUM - DECK STACK + FLIGHT POOL (markup only; GSAP drives every transform)
// Original Hukum card backs. Nothing here knows card identities.
// ============================================

import { CardBack } from '../cards/PlayingCard';

export const STACK_SIZE = 8;
export const FLIGHT_POOL = 10;
export const SPARKS = 5;

function Spark() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 1c.9 5.4 2.6 8.6 11 11-8.4 2.4-10.1 5.6-11 11-.9-5.4-2.6-8.6-11-11 8.4-2.4 10.1-5.6 11-11z" fill="#fff6c2" stroke="#ffcb22" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

/** Central deck (shadow, individually animated card backs, sparkles, glint) plus the pool of flying cards. */
export function DeckStack() {
    return (
        <>
            <div className="deal-anchor">
                <div className="deal-body">
                    <span className="deal-shadow" />
                    {Array.from({ length: STACK_SIZE }).map((_, i) => (
                        <div key={i} className="deal-card">
                            <CardBack />
                        </div>
                    ))}
                    <span className="deal-glint"><span className="deal-glint-bar" /></span>
                    {Array.from({ length: SPARKS }).map((_, i) => (
                        <span key={i} className={`deal-spark s${i}`}>
                            <Spark />
                        </span>
                    ))}
                </div>
            </div>

            {Array.from({ length: FLIGHT_POOL }).map((_, i) => (
                <div key={i} className="deal-flight">
                    <div className="deal-flight-card">
                        <CardBack />
                    </div>
                </div>
            ))}

            {/* Measures the real hand-card width (it's a CSS clamp) */}
            <span className="deal-probe" />
        </>
    );
}
