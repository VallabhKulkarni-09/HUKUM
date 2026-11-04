// ============================================
// HUKUM - DECK ENTRANCE, SHUFFLE AND CONSOLIDATION TIMELINES
// Each stack card has its own transforms so the deck visibly mixes
// instead of spinning as one flat image. All offsets are deterministic
// (derived from card index), so every run looks deliberate.
// ============================================

import gsap from 'gsap';
import { playSound } from '../../audio/soundManager';

/** Resting offset of stack card i: gives the deck visible thickness */
export const restX = (i: number) => i * 0.7;
export const restY = (i: number) => -i * 2;

// Seconds. Entrance ~0.4, separation ~0.25, shuffle ~0.85, consolidation ~0.4.
export const TIMING = {
    entrance: 0.4,
    separate: 0.24,
    passGap: 0.24,
    passes: 3,
    crossDur: 0.2,
    crossStagger: 0.022,
    consolidate: 0.28,
};

/** Put the stack in its resting pile; cards at index ≥ visible are hidden (thinner deck). */
export function setStackRest(cards: HTMLElement[], visible: number) {
    cards.forEach((c, i) => {
        gsap.set(c, { x: restX(i), y: restY(i), rotation: 0, zIndex: i, autoAlpha: i < visible ? 1 : 0 });
    });
}

/** Small star bursts around the deck */
export function sparkle(sparks: HTMLElement[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    sparks.forEach((s, i) => {
        tl.fromTo(s,
            { autoAlpha: 0, scale: 0.2, rotation: -40 },
            { autoAlpha: 1, scale: 1, rotation: 20, duration: 0.18, ease: 'back.out(3)', immediateRender: false },
            i * 0.05,
        ).to(s, { autoAlpha: 0, scale: 0.4, rotation: 60, duration: 0.22, ease: 'power1.in' }, i * 0.05 + 0.2);
    });
    return tl;
}

/** Stage 1: deck drops onto the table, slightly small and turned, settling with a bounce. */
export function deckEntrance(body: HTMLElement, shadow: HTMLElement, duration = TIMING.entrance): gsap.core.Timeline {
    return gsap.timeline()
        .fromTo(body,
            { autoAlpha: 0, scale: 0.55, rotation: -16, y: -26 },
            { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration, ease: 'back.out(1.8)' })
        .fromTo(shadow,
            { autoAlpha: 0, scale: 0.45 },
            { autoAlpha: 1, scale: 1, duration, ease: 'power2.out' }, 0);
}

/**
 * Stages 2 + 3: split into two packets, then several crossing passes
 * where cards from alternate packets hop over the centre and restack.
 */
export function shuffleMotion(cards: HTMLElement[], cardW: number): gsap.core.Timeline {
    const tl = gsap.timeline();
    const left = cards.filter((_, i) => i % 2 === 0);
    const right = cards.filter((_, i) => i % 2 === 1);
    const spread = cardW * 0.56;

    // Stage 2: separate — packets slide apart, up and outward, rotating opposite ways
    tl.addLabel('separate');
    tl.to(left, {
        x: i => -spread - i * 1.5, y: i => -8 - i * 1.6, rotation: i => -7 - i * 2.2,
        duration: TIMING.separate, ease: 'power2.out', stagger: 0.02,
    }, 'separate');
    tl.to(right, {
        x: i => spread + i * 1.5, y: i => -8 - i * 1.6, rotation: i => 7 + i * 2.2,
        duration: TIMING.separate, ease: 'power2.out', stagger: 0.02,
    }, 'separate');

    // Stage 3: crossing passes, interleaving L/R so the packets mix
    const interleaved: { el: HTMLElement; fromLeft: boolean }[] = [];
    for (let k = 0; k < Math.max(left.length, right.length); k++) {
        if (left[k]) interleaved.push({ el: left[k], fromLeft: true });
        if (right[k]) interleaved.push({ el: right[k], fromLeft: false });
    }

    const start = TIMING.separate + 0.04;
    for (let p = 0; p < TIMING.passes; p++) {
        const t0 = start + p * TIMING.passGap;
        // One riffle recording covers all passes
        if (p === 0) tl.call(() => playSound('cardShuffle'), undefined, t0 - 0.05);
        interleaved.forEach(({ el, fromLeft }, k) => {
            // Pass 0 sends left cards right; each pass reverses
            const side = (fromLeft ? 1 : -1) * (p % 2 === 0 ? 1 : -1);
            const t = t0 + k * TIMING.crossStagger;
            const dist = spread * (0.86 + (k % 3) * 0.1);
            const lift = 14 + (k % 4) * 5;
            tl.to(el, { x: side * dist, rotation: side * (5 + (k % 4) * 3), duration: TIMING.crossDur, ease: 'power2.inOut' }, t);
            tl.to(el, { y: `-=${lift}`, duration: TIMING.crossDur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t);
            // Restack mid-hop so cards land on top of the other packet
            tl.set(el, { zIndex: 20 + p * 20 + k }, t + TIMING.crossDur / 2);
        });
    }
    return tl;
}

/** Stage 4: everything slides back into one neat pile, then a landing bounce. */
export function consolidate(cards: HTMLElement[], body: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline();
    tl.set(cards, { zIndex: i => i });
    tl.to(cards, {
        x: i => restX(i), y: i => restY(i), rotation: 0,
        duration: TIMING.consolidate, ease: 'power3.out', stagger: 0.015,
    });
    tl.to(body, { scale: 1.07, duration: 0.08, ease: 'power1.out' }, '-=0.1');
    tl.to(body, { scale: 1, duration: 0.2, ease: 'back.out(3)' });
    return tl;
}

/** Highlight sweep across the top card plus a sparkle burst, once the deck has settled. */
export function settleFx(glintBar: HTMLElement, sparks: HTMLElement[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    // immediateRender:false so the stripe isn't drawn at its start position while the timeline waits
    tl.fromTo(glintBar,
        { autoAlpha: 1, xPercent: -110 },
        { autoAlpha: 0.2, xPercent: 110, duration: 0.36, ease: 'power2.inOut', immediateRender: false });
    tl.add(sparkle(sparks), 0);
    return tl;
}
