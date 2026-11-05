// ============================================
// HUKUM - OPENING TOSS (table centre)
// 1. A shuffled spread of face-down cards fans out.
// 2. All four players pick at the same time (tap a card; bots and
//    late players are picked for by the server).
// 3. Each picked card flies toward its owner's seat.
// 4. When everyone has picked, the four cards come back to the table,
//    flip together, and the team totals decide who deals.
// The server owns the spread and the result; the client never sees a card
// before all four have picked.
// ============================================

import { useEffect, useRef, useState } from 'react';
import type { PlayerId, PublicPlayer, PublicToss, Rank, TeamId } from '../../types';
import { CardBack, PlayingCard } from '../cards/PlayingCard';
import { playSound } from '../../audio/soundManager';
import './toss.css';

type SeatPos = 'bottom' | 'left' | 'top' | 'right';
const TEAM_NAME: Record<TeamId, string> = { A: 'Alpha', B: 'Bravo' };
/** Toss values shown next to the totals */
const POINTS_HINT = 'A 8 · K 7 · Q 6 · J 5 · 10 4 · 9 3 · 8 2 · 7 1';
const TOSS_POINTS: Record<Rank, number> = { A: 8, K: 7, Q: 6, J: 5, '10': 4, '9': 3, '8': 2, '7': 1 };

interface TossStageProps {
    toss: PublicToss;
    players: PublicPlayer[];
    playerId: PlayerId;
    myTeam: TeamId;
    posOf: (seat: number) => SeatPos;
    onPick: (slot: number) => void;
}

/** Keyed by round in the parent, so local state resets for every redraw */
export function TossStage({ toss, players, playerId, myTeam, posOf, onPick }: TossStageProps) {
    const [localPick, setLocalPick] = useState<number | null>(null);
    const owners = new Map<number, PlayerId>();
    for (const [id, slot] of Object.entries(toss.picks)) owners.set(slot, id);

    const serverPick = toss.picks[playerId];
    // Optimistic pick, dropped if someone else got that slot first
    const myPick = serverPick ?? (localPick !== null && !owners.has(localPick) ? localPick : null);
    const canPick = myPick === null && toss.result === null;
    const revealed = toss.cards !== null;

    const left = useCountdown(toss.msLeft, toss.round);
    useTossSounds(toss);

    const posOfPlayer = (id: PlayerId): SeatPos => {
        const p = players.find(x => x.id === id);
        return p ? posOf(p.seat) : 'bottom';
    };

    const pick = (slot: number) => {
        if (!canPick || owners.has(slot)) return;
        setLocalPick(slot);
        onPick(slot);
    };

    if (revealed) {
        return <TossReveal toss={toss} players={players} playerId={playerId} myTeam={myTeam} posOfPlayer={posOfPlayer} />;
    }

    const prompt = canPick
        ? <>{toss.round > 1 ? 'Pick again!' : 'Pick a card!'} <span className="toss-timer" aria-label={`${left} seconds left`}>{left}</span></>
        : `Waiting for others… ${Object.keys(toss.picks).length}/4`;

    return (
        <div className="toss" aria-label="Toss: pick a card">
            <div className="toss-title display">
                {toss.round > 1 ? 'Draw again!' : 'Toss'}
                <span className="toss-sub">Lower team total deals</span>
            </div>
            <div className={`toss-spread ${canPick ? 'can-pick' : ''}`} role="group" aria-label="Face-down cards">
                {Array.from({ length: toss.slots }).map((_, i) => {
                    const owner = owners.get(i) ?? (i === myPick ? playerId : undefined);
                    const dir = owner ? posOfPlayer(owner) : null;
                    // Fan offsets for each layout: 4 columns (portrait), 6 columns, one row of all
                    const grid = (cols: number) => ({ c: (i % cols) - (cols - 1) / 2, r: Math.floor(i / cols) });
                    const g4 = grid(4);
                    const g6 = grid(6);
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`toss-card ${owner ? `taken to-${dir}` : ''}`}
                            style={{
                                '--i': i,
                                '--c4': g4.c, '--r4': g4.r,
                                '--c6': g6.c, '--r6': g6.r,
                                '--c12': i - (toss.slots - 1) / 2,
                            } as React.CSSProperties}
                            onClick={() => pick(i)}
                            disabled={!canPick || !!owner}
                            aria-label={owner ? `Card ${i + 1}, taken` : `Pick card ${i + 1}`}
                        >
                            <CardBack />
                        </button>
                    );
                })}
            </div>
            <div className={`status ${canPick ? 'turn' : 'info'}`} aria-live="polite">
                <span>{prompt}</span>
            </div>
        </div>
    );
}

// ============================================
// Reveal: four cards slide back from the seats, flip together, totals + result
// ============================================

function TossReveal({ toss, players, playerId, myTeam, posOfPlayer }: {
    toss: PublicToss;
    players: PublicPlayer[];
    playerId: PlayerId;
    myTeam: TeamId;
    posOfPlayer: (id: PlayerId) => SeatPos;
}) {
    const cards = toss.cards!;
    const totals = toss.totals ?? { A: 0, B: 0 };
    const result = toss.result;
    const nameOf = (id: PlayerId) => (id === playerId ? 'You' : players.find(p => p.id === id)?.name ?? '');

    const headline = result === 'TIE'
        ? 'Tie! Everyone draws again'
        : result === myTeam ? 'Your team deals!' : `Team ${TEAM_NAME[result as TeamId]} deals!`;

    // Your team on the left; you first within your team
    const teams: TeamId[] = myTeam === 'A' ? ['A', 'B'] : ['B', 'A'];
    const membersOf = (team: TeamId) => players
        .filter(p => p.team === team && cards[p.id])
        .sort((a, b) => (a.id === playerId ? -1 : b.id === playerId ? 1 : a.seat - b.seat));

    return (
        <div className="toss revealed" aria-label="Toss result">
            <div className="toss-teams">
                {teams.map((team, ti) => (
                    <div key={team} className={`toss-team team-${team.toLowerCase()} ${result === team ? 'deals' : ''}`}>
                        <div className="toss-pair">
                            {membersOf(team).map((p, mi) => {
                                const card = cards[p.id];
                                const from = posOfPlayer(p.id);
                                return (
                                    <div key={p.id} className={`toss-drawn from-${from}`} style={{ '--n': ti * 2 + mi } as React.CSSProperties}>
                                        <div className="toss-flip" aria-label={`${nameOf(p.id)}: ${card.rank}, ${TOSS_POINTS[card.rank]} point${TOSS_POINTS[card.rank] === 1 ? '' : 's'}`}>
                                            <div className="toss-flip-inner">
                                                <div className="toss-face back"><CardBack /></div>
                                                <div className="toss-face front"><PlayingCard card={card} isInTrick /></div>
                                            </div>
                                        </div>
                                        <span className="toss-who">
                                            <span className="toss-who-name">{nameOf(p.id)}</span>
                                            <span className="toss-who-pts">{TOSS_POINTS[card.rank]}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <span className={`toss-total team-${team.toLowerCase()} ${result === team ? 'deals' : ''}`}>
                            <span className="toss-total-name">{TEAM_NAME[team]}{team === myTeam && <span className="toss-total-you"> (you)</span>}</span>
                            <span className="toss-total-num">{totals[team]}</span>
                        </span>
                    </div>
                ))}
            </div>
            <div className={`toss-result status ${result === 'TIE' ? 'info' : result === myTeam ? 'good' : 'bad'}`} aria-live="polite">
                <span>{headline}</span>
            </div>
            <p className="toss-hint">{POINTS_HINT}</p>
        </div>
    );
}

// ============================================
// Hooks
// ============================================

/** Whole seconds left, counted locally from the last server message */
function useCountdown(msLeft: number, round: number): number {
    const [left, setLeft] = useState(() => Math.ceil(msLeft / 1000));
    const deadline = useRef(0);
    useEffect(() => {
        deadline.current = performance.now() + msLeft;
    }, [msLeft, round]);
    useEffect(() => {
        const t = window.setInterval(() => {
            setLeft(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
        }, 250);
        return () => window.clearInterval(t);
    }, []);
    return left;
}

/** Shuffle when a spread appears, a flick per pick, a snap when the cards flip */
function useTossSounds(toss: PublicToss) {
    const prev = useRef<PublicToss | null>(null);
    useEffect(() => {
        const p = prev.current;
        prev.current = toss;
        const picks = Object.keys(toss.picks).length;
        if (!p) {
            if (picks === 0) playSound('cardShuffle');
            return;
        }
        if (picks > Object.keys(p.picks).length) playSound('cardDeal');
        if (toss.cards && !p.cards) {
            const t = window.setTimeout(() => playSound('cardPlay'), 900);
            const r = window.setTimeout(() => playSound(toss.result === 'TIE' ? 'trickCollect' : 'hukumChosen'), 1500);
            return () => { window.clearTimeout(t); window.clearTimeout(r); };
        }
    }, [toss]);
}
