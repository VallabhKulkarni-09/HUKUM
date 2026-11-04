// ============================================
// HUKUM - CARD FLIGHT (deck → seat)
// Curved path: x and y use different eases and the inner card gets an
// extra lift, so cards arc instead of sliding in a straight line.
// ============================================

import gsap from 'gsap';
import type { PlayerId } from '../../types';

export interface Point { x: number; y: number }
export interface FlightTarget extends Point { rotation: number; scale: number; local: boolean }

export const FLIGHT = { duration: 0.42, stagger: 0.085 };

const center = (r: DOMRect, origin: DOMRect): Point => ({
    x: r.left + r.width / 2 - origin.left,
    y: r.top + r.height / 2 - origin.top,
});

/**
 * Where card #index (0-based, of `total`) for this player should land, in layer coordinates.
 * Local player: the slot in the fanned hand. Others: their face-down fan (or avatar before it exists).
 */
export function measureTarget(
    table: HTMLElement,
    layerRect: DOMRect,
    playerId: PlayerId,
    myId: PlayerId,
    index: number,
    total: number,
    deckW: number,
    handCardW: number,
): FlightTarget {
    if (playerId === myId) {
        const hand = table.querySelector<HTMLElement>('.tbl-hand');
        const r = (hand ?? table).getBoundingClientRect();
        const step = total <= 4 ? handCardW * 0.88 : handCardW * 0.5;
        const mid = (total - 1) / 2;
        const offset = index - mid;
        return {
            x: r.left + r.width / 2 - layerRect.left + offset * step,
            y: r.bottom - layerRect.top - handCardW * 1.4 * 0.5 + offset * offset * 1.4,
            rotation: offset * 3.2,
            scale: handCardW / deckW,
            local: true,
        };
    }

    const seat = table.querySelector<HTMLElement>(`[data-deal-seat="${CSS.escape(playerId)}"]`);
    const fan = seat?.querySelector<HTMLElement>('.seat-fan');
    const anchor = fan ?? seat?.querySelector<HTMLElement>('.seat-id') ?? seat ?? table;
    const back = fan?.querySelector<HTMLElement>('.pcard-back');
    const miniW = back?.offsetWidth || 16;
    const p = center(anchor.getBoundingClientRect(), layerRect);
    return { ...p, rotation: (index - (total - 1) / 2) * 5, scale: miniW / deckW, local: false };
}

/**
 * Fly one card. `onLand` fires when the card reaches the seat: for opponents the seat's
 * fan grows under the flying back, which then fades; for me the back flips edge-on and
 * the real card face (already rendered from server data) flips open in its place.
 */
export function cardFlight(el: HTMLElement, from: Point, to: FlightTarget, seq: number, onLand: () => void): gsap.core.Timeline {
    const inner = el.firstElementChild as HTMLElement;
    const d = FLIGHT.duration;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const lift = Math.max(18, dist * 0.12);
    const spin = (seq % 2 === 0 ? 1 : -1) * (14 + (seq % 3) * 6);
    const peak = Math.max(to.scale, 1) * 1.1;

    const tl = gsap.timeline();
    tl.set(el, { x: from.x, y: from.y, rotation: 0, scale: 1, scaleX: 1, autoAlpha: 1, zIndex: 100 + seq });
    tl.set(inner, { y: 0 });
    tl.to(el, { x: to.x, duration: d, ease: 'power1.inOut' }, 0);
    tl.to(el, { y: to.y, duration: d, ease: 'power2.in' }, 0);
    tl.to(inner, { y: -lift, duration: d / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
    tl.to(el, { rotation: to.rotation + spin, scale: peak, duration: d * 0.45, ease: 'sine.out' }, 0);
    tl.to(el, { rotation: to.rotation, scale: to.scale, duration: d * 0.55, ease: 'sine.in' }, d * 0.45);

    // Landing bounce
    tl.to(el, { scale: to.scale * 1.12, duration: 0.07, ease: 'power1.out' });
    tl.to(el, { scale: to.scale, duration: 0.08, ease: 'power1.in' });

    if (to.local) {
        tl.to(el, { scaleX: 0, duration: 0.08, ease: 'power1.in' });
        tl.call(onLand);
        tl.set(el, { autoAlpha: 0 });
    } else {
        tl.call(onLand);
        tl.to(el, { autoAlpha: 0, duration: 0.08 });
    }
    return tl;
}
