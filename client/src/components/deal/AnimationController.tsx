// ============================================
// HUKUM - DEAL ANIMATION CONTROLLER
// Mounted (keyed by job id) only while a deal job is active.
// Runs: deck entrance → shuffle → consolidation → deal → deck exit,
// all inside one gsap.context so unmount reverts every tween.
// ============================================

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import type { PlayerId } from '../../types';
import type { DealDirector } from './DealDirector';
import { DeckStack } from './DeckStack';
import { collectDeck } from './deckElements';
import { consolidate, deckEntrance, setStackRest, settleFx, shuffleMotion, sparkle } from './ShuffleAnimation';
import { remainingAtStart, runDeal, stackFor } from './DealAnimation';
import './deal.css';

interface DealLayerProps {
    director: DealDirector;
    jobId: number;
    myId: PlayerId;
}

export function DealLayer({ director, jobId, myId }: DealLayerProps) {
    const layerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const layer = layerRef.current;
        const table = layer?.parentElement;
        const job = director.currentJob(jobId);
        const d = layer ? collectDeck(layer) : null;
        if (!layer || !table || !job || !d) {
            director.finish(jobId);
            return;
        }

        const ctx = gsap.context(() => { }, layer);

        // Background tab: rAF stops, so don't leave the table waiting
        const onHidden = () => { if (document.hidden) director.finish(jobId); };
        document.addEventListener('visibilitychange', onHidden);

        ctx.add(() => {
            // Anchor the deck on the trick area's centre
            const layerRect = layer.getBoundingClientRect();
            const centreEl = table.querySelector<HTMLElement>('[data-deal-center]');
            const r = centreEl?.getBoundingClientRect();
            const deckCenter = r && r.width > 0
                ? { x: r.left + r.width / 2 - layerRect.left, y: r.top + r.height / 2 - layerRect.top }
                : { x: layerRect.width / 2, y: layerRect.height / 2 };
            gsap.set(d.anchor, { x: deckCenter.x, y: deckCenter.y });
            setStackRest(d.cards, stackFor(remainingAtStart(job)));
            gsap.set([d.glintBar, ...d.sparks, ...d.flights], { autoAlpha: 0 });

            const exitDeck = () => {
                director.setStage(jobId, 'DEAL_COMPLETE');
                ctx.add(() => {
                    gsap.timeline({ onComplete: () => director.finish(jobId) })
                        .to(d.body, { autoAlpha: 0, scale: 0.7, duration: job.reduced ? 0.1 : 0.22, ease: 'power2.in' });
                });
            };

            const startDealing = () => {
                director.setStage(jobId, 'DEALING');
                runDeal({ ctx, deck: d, table, layer, director, jobId, myId, deckCenter, onDone: exitDeck });
            };

            const tl = gsap.timeline();
            director.setStage(jobId, 'DECK_ENTERING');

            if (job.reduced) {
                // Simplified: deck fades in, no shuffle movement
                tl.fromTo(d.body, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 });
                tl.set(d.shadow, { autoAlpha: 1 });
                tl.call(startDealing);
            } else if (job.shuffle) {
                const cardW = d.cards[0]?.offsetWidth || 60;
                tl.add(deckEntrance(d.body, d.shadow));
                tl.add(sparkle(d.sparks), '-=0.18');
                tl.call(() => director.setStage(jobId, 'SHUFFLING'), undefined, '-=0.3');
                tl.add(shuffleMotion(d.cards, cardW), '-=0.3');
                tl.add(consolidate(d.cards, d.body));
                tl.add(settleFx(d.glintBar, d.sparks), '-=0.15');
                tl.call(() => director.setStage(jobId, 'SHUFFLE_COMPLETE'), undefined, '<');
                // First card leaves while the sparkle is still fading
                tl.call(startDealing, undefined, '<0.12');
            } else {
                // Second half of a hand: the same deck comes back, no shuffle
                tl.add(deckEntrance(d.body, d.shadow, 0.26));
                tl.call(startDealing, undefined, '-=0.05');
            }
        });

        return () => {
            document.removeEventListener('visibilitychange', onHidden);
            ctx.revert();
        };
    }, [director, jobId, myId]);

    return (
        <div className="deal-layer" ref={layerRef} aria-hidden>
            <DeckStack />
        </div>
    );
}
