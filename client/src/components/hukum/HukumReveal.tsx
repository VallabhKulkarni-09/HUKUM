// ============================================
// HUKUM - TRUMP REVEAL
// When Hukum is chosen, a big suit card appears in the middle of the table,
// then shrinks and flies into the Hukum medal in the HUD. The medal then
// glows for the rest of the hand. Timing is decided by useHukumReveal.
// ============================================

import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import type { Suit } from '../../types';
import { SuitIcon } from '../cards/SuitIcon';
import { SUIT_LABEL } from '../cards/suitLabels';
import './hukum.css';

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Timings (seconds): pop in, hold in the centre, fly to the medal (≈1.3 s total) */
const T = { pop: 0.28, hold: 0.32, fly: 0.7 };

interface HukumFlyProps {
    suit: Suit;
    /** The medal the card flies into */
    targetRef: RefObject<HTMLElement | null>;
    onDone: () => void;
}

export function HukumFly({ suit, targetRef, onDone }: HukumFlyProps) {
    const el = useRef<HTMLDivElement>(null);
    const done = useRef(onDone);

    useLayoutEffect(() => {
        done.current = onDone;
    });

    useLayoutEffect(() => {
        const node = el.current;
        const target = targetRef.current;
        if (!node || !target || reducedMotion()) {
            done.current();
            return;
        }

        // Start: middle of the trick area (falls back to the viewport centre)
        const from = document.querySelector('[data-deal-center]')?.getBoundingClientRect();
        const fx = from ? from.left + from.width / 2 : window.innerWidth / 2;
        const fy = from ? from.top + from.height / 2 : window.innerHeight / 2;
        const to = target.getBoundingClientRect();
        const w = node.offsetWidth;
        const h = node.offsetHeight;

        const ctx = gsap.context(() => {
            gsap.set(node, { x: fx - w / 2, y: fy - h / 2, width: w, height: h });
            const tl = gsap.timeline({ onComplete: () => done.current() });
            tl.fromTo(node,
                { scale: 0.35, rotation: -14, opacity: 0 },
                { scale: 1, rotation: 0, opacity: 1, duration: T.pop, ease: 'back.out(2.2)' });
            tl.from(node.querySelector('.hukum-fly-burst'), { scale: 0.2, opacity: 0, duration: T.pop + 0.2, ease: 'power2.out' }, 0);
            tl.to(node.querySelector('.hukum-fly-label'), { opacity: 0, duration: 0.18 }, T.pop + T.hold);
            tl.to(node.querySelector('.hukum-fly-burst'), { opacity: 0, duration: 0.25 }, T.pop + T.hold);
            tl.to(node, {
                x: to.left, y: to.top, width: to.width, height: to.height,
                borderRadius: '50%', rotation: 360,
                duration: T.fly, ease: 'power3.inOut',
            }, T.pop + T.hold);
        }, node);
        return () => ctx.revert();
    }, [targetRef]);

    return (
        <>
            <div className="hukum-fly-layer" aria-hidden>
                <div ref={el} className={`hukum-fly suit-${suit.toLowerCase()}`}>
                    <span className="hukum-fly-burst" />
                    <SuitIcon suit={suit} className="hukum-fly-suit" />
                    <span className="hukum-fly-label display">{SUIT_LABEL[suit]}</span>
                </div>
            </div>
            <span className="sr-only" role="status">Hukum is {SUIT_LABEL[suit]}</span>
        </>
    );
}
