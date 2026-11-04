// ============================================
// HUKUM - TABLE SOUNDS + VIBRATION
// Sounds follow what the player can SEE: they're derived from changes in the
// displayed table state, so a bot's card sounds when it appears (e.g. after the
// deal finishes), and nothing replays on mount or reconnect.
// My own card plays its sound immediately on tap (useWebSocket), so it's skipped here.
// ============================================

import { useEffect, useRef } from 'react';
import type { GamePhase, PlayerId, Suit, TeamId, TrickCard } from '../types';
import type { HandResult } from '../hooks/useWebSocket';
import { playSound } from '../audio/soundManager';
import { vibrate } from '../audio/haptics';

export interface TableSoundInput {
    phase: GamePhase;
    playerId: PlayerId;
    myTeam: TeamId;
    /** Trick cards currently drawn on the table */
    trickCards: TrickCard[];
    trickCounts: Record<TeamId, number>;
    trumpSuit: Suit | null;
    vakkaiActive: boolean;
    /** It's my move: a card to play or a decision to make */
    myMove: boolean;
    handResult: HandResult | null;
    matchWon: boolean;
}

export function useTableSounds(s: TableSoundInput) {
    const prev = useRef<TableSoundInput | null>(null);

    useEffect(() => {
        const p = prev.current;
        prev.current = s;
        if (!p) return; // first render (incl. reconnect): no sounds for state that already happened

        // Someone else's card lands in the trick
        const fresh = s.trickCards.slice(p.trickCards.length);
        if (s.trickCards.length > p.trickCards.length && fresh.some(tc => tc.playerId !== s.playerId)) {
            playSound('cardPlay');
        }

        // Trick collected (a team's trick count went up)
        const gainedMine = s.trickCounts[s.myTeam] > p.trickCounts[s.myTeam];
        const gained = gainedMine || s.trickCounts.A + s.trickCounts.B > p.trickCounts.A + p.trickCounts.B;
        if (gained) {
            playSound('trickCollect');
            if (gainedMine) window.setTimeout(() => playSound('trickMine'), 140);
        }

        if (s.trumpSuit && !p.trumpSuit) playSound('hukumChosen');

        if (s.vakkaiActive && !p.vakkaiActive) {
            playSound('vakkaiDeclare');
            vibrate('vakkai');
        }

        if (s.myMove && !p.myMove) {
            playSound('turnNotify');
            vibrate('turn');
        }

        if (s.phase !== p.phase) {
            if (s.phase === 'HAND_END') {
                const won = s.handResult?.winnerTeam === s.myTeam;
                playSound(won ? 'handWin' : 'handLose');
                vibrate(won ? 'handWin' : 'handLose');
            }
            if (s.phase === 'MATCH_END') {
                playSound(s.matchWon ? 'matchWin' : 'matchLose');
                vibrate(s.matchWon ? 'matchWin' : 'handLose');
            }
        }
    });
}

/** Waiting room: a chime when someone sits down, a soft swoosh when a seat empties. */
export function useSeatSounds(playerCount: number, inLobby: boolean) {
    const prev = useRef<number | null>(null);
    useEffect(() => {
        const p = prev.current;
        prev.current = inLobby ? playerCount : null;
        if (!inLobby || p === null) return;
        if (playerCount > p) playSound('playerJoin');
        else if (playerCount < p) playSound('playerLeave');
    }, [playerCount, inLobby]);
}
