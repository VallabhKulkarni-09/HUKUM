// ============================================
// HUKUM GAME - SCORING SYSTEM
// ============================================

import { Score, TeamId } from '../types.js';

/**
 * Create initial score
 */
export function createScore(): Score {
    return { A: 0, B: 0 };
}

/**
 * Apply zero-sum score change
 * When teamA gains X, teamB loses X
 */
export function applyScore(score: Score, winningTeam: TeamId, points: number): Score {
    const newScore = { ...score };

    if (winningTeam === 'A') {
        newScore.A += points;
        newScore.B -= points;
    } else {
        newScore.B += points;
        newScore.A -= points;
    }

    return newScore;
}

/**
 * Check if match has ended (score crosses ±16)
 */
export function isMatchEnd(score: Score): boolean {
    return score.A >= 16 || score.A <= -16 || score.B >= 16 || score.B <= -16;
}

/**
 * Get match winner (if match has ended)
 */
export function getMatchWinner(score: Score): TeamId | null {
    if (score.A >= 16) return 'A';
    if (score.B >= 16) return 'B';
    if (score.A <= -16) return 'B';
    if (score.B <= -16) return 'A';
    return null;
}

/**
 * Scoring constants
 */
export const SCORING = {
    VAKKAI_SUCCESS: 8,      // +8 for winning 4 consecutive tricks
    VAKKAI_FAILURE: 16,     // +16 to opponents (−16 to declarer's team)
    TRUMP_TEAM_WIN: 5,      // +5 for trump team winning 5 tricks
    DEALER_TEAM_WIN: 10,    // +10 for dealer team winning 4 tricks
    TRUMP_TEAM_TARGET: 5,   // Trump team needs 5 tricks
    DEALER_TEAM_TARGET: 4,  // Dealer team needs 4 tricks
    VAKKAI_TARGET: 4,       // Vakkai needs 4 consecutive wins
    MATCH_END_THRESHOLD: 16,
};

/**
 * Check if a team has won the current hand (normal play)
 * Returns winning team and reason, or null if hand continues
 */
export function checkHandWinner(
    trickCounts: Record<TeamId, number>,
    trumpTeam: TeamId,
    dealerTeam: TeamId
): { team: TeamId; points: number; reason: string } | null {
    // Trump team wins at 5 tricks
    if (trickCounts[trumpTeam] >= SCORING.TRUMP_TEAM_TARGET) {
        return {
            team: trumpTeam,
            points: SCORING.TRUMP_TEAM_WIN,
            reason: `Trump team won ${SCORING.TRUMP_TEAM_TARGET} tricks`,
        };
    }

    // Dealer team wins at 4 tricks
    if (trickCounts[dealerTeam] >= SCORING.DEALER_TEAM_TARGET) {
        return {
            team: dealerTeam,
            points: SCORING.DEALER_TEAM_WIN,
            reason: `Dealer team won ${SCORING.DEALER_TEAM_TARGET} tricks`,
        };
    }

    return null;
}

/**
 * Calculate Vakkai result
 */
export function calculateVakkaiResult(
    consecutiveWins: number,
    declarerTeam: TeamId
): { winnerTeam: TeamId; points: number; success: boolean } {
    if (consecutiveWins >= SCORING.VAKKAI_TARGET) {
        // Vakkai success: +8 to declarer's team
        return {
            winnerTeam: declarerTeam,
            points: SCORING.VAKKAI_SUCCESS,
            success: true,
        };
    } else {
        // Vakkai failure: +16 to opponents (−16 to declarer)
        const opponentTeam: TeamId = declarerTeam === 'A' ? 'B' : 'A';
        return {
            winnerTeam: opponentTeam,
            points: SCORING.VAKKAI_FAILURE,
            success: false,
        };
    }
}

/**
 * Get the team that should choose the next dealer
 * (The team with negative score chooses)
 */
export function getDealerChoosingTeam(score: Score): TeamId {
    // If both at 0, this shouldn't happen in normal play
    // But if it does (after first hand), default behavior:
    // The team that was negative before (came to 0) chooses
    if (score.A < 0) return 'A';
    if (score.B < 0) return 'B';

    // If both >= 0 (starting position or someone came back to 0)
    // This edge case: default to A
    return 'A';
}

/**
 * Get the opposite team
 */
export function getOppositeTeam(team: TeamId): TeamId {
    return team === 'A' ? 'B' : 'A';
}
