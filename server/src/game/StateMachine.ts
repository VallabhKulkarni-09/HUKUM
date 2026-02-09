// ============================================
// HUKUM GAME - STATE MACHINE
// ============================================

import { GamePhase } from '../types.js';

/**
 * Valid phase transitions
 */
const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
    'WAITING_FOR_PLAYERS': ['READY_CHECK'],
    'READY_CHECK': ['INITIAL_TOSS', 'WAITING_FOR_PLAYERS'],
    'INITIAL_TOSS': ['DEALING_FIRST'],
    'DEALING_FIRST': ['VAKKAI_DECISION'],
    'VAKKAI_DECISION': ['HUKUM_SELECTION', 'VAKKAI_PLAY'],
    'HUKUM_SELECTION': ['DEALING_SECOND'],
    'DEALING_SECOND': ['TRICK_PLAY'],
    'TRICK_PLAY': ['TRICK_PLAY', 'HAND_END', 'MATCH_END'],
    'VAKKAI_PLAY': ['VAKKAI_PLAY', 'HAND_END', 'MATCH_END'],
    'HAND_END': ['DEALER_SELECTION', 'MATCH_END'],
    'DEALER_SELECTION': ['DEALING_FIRST'],
    'MATCH_END': [],
};

/**
 * State machine for game phases
 */
export class StateMachine {
    private currentPhase: GamePhase;
    private history: GamePhase[];

    constructor(initialPhase: GamePhase = 'WAITING_FOR_PLAYERS') {
        this.currentPhase = initialPhase;
        this.history = [initialPhase];
    }

    /**
     * Get current phase
     */
    getPhase(): GamePhase {
        return this.currentPhase;
    }

    /**
     * Check if a transition is valid
     */
    canTransitionTo(nextPhase: GamePhase): boolean {
        return VALID_TRANSITIONS[this.currentPhase].includes(nextPhase);
    }

    /**
     * Attempt to transition to a new phase
     * @throws Error if transition is invalid
     */
    transitionTo(nextPhase: GamePhase): void {
        if (!this.canTransitionTo(nextPhase)) {
            throw new Error(
                `Invalid transition: ${this.currentPhase} -> ${nextPhase}. ` +
                `Valid transitions: ${VALID_TRANSITIONS[this.currentPhase].join(', ')}`
            );
        }
        this.currentPhase = nextPhase;
        this.history.push(nextPhase);
    }

    /**
     * Force a phase (for testing/recovery only)
     */
    forcePhase(phase: GamePhase): void {
        this.currentPhase = phase;
        this.history.push(phase);
    }

    /**
     * Get transition history
     */
    getHistory(): GamePhase[] {
        return [...this.history];
    }

    /**
     * Check if game is in a terminal state
     */
    isTerminal(): boolean {
        return this.currentPhase === 'MATCH_END';
    }

    /**
     * Check if currently in playing phase
     */
    isPlaying(): boolean {
        return ['TRICK_PLAY', 'VAKKAI_PLAY'].includes(this.currentPhase);
    }

    /**
     * Reset state machine
     */
    reset(): void {
        this.currentPhase = 'WAITING_FOR_PLAYERS';
        this.history = ['WAITING_FOR_PLAYERS'];
    }
}

// Singleton-style factory for creating state machines
export function createStateMachine(initialPhase?: GamePhase): StateMachine {
    return new StateMachine(initialPhase);
}
