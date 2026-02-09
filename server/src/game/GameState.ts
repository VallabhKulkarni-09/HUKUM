// ============================================
// HUKUM GAME - GAME STATE
// ============================================

import {
    GameState,
    GamePhase,
    Player,
    PlayerId,
    Card,
    Suit,
    TeamId,
    SeatPosition,
    TrickState,
    VakkaiState,
    Score,
    PublicGameState,
    getTeamForSeat,
} from '../types.js';
import { StateMachine, createStateMachine } from './StateMachine.js';
import { createTrickState, addCardToTrick, calculateTrickWinner, isTrickComplete, getTrickTurnOrder } from './TrickLogic.js';
import { createScore, applyScore, checkHandWinner, calculateVakkaiResult, isMatchEnd, getDealerChoosingTeam, getOppositeTeam, SCORING } from './Scoring.js';
import { createDeck, shuffleDeck, dealCards, drawTossCards, calculateTossPoints } from './Deck.js';

/**
 * Full game engine class
 */
export class GameEngine {
    private stateMachine: StateMachine;
    private players: Map<PlayerId, Player>;
    private gameState: GameState;
    private deck: Card[];
    private remainingDeck: Card[];

    constructor() {
        this.stateMachine = createStateMachine();
        this.players = new Map();
        this.deck = [];
        this.remainingDeck = [];
        this.gameState = this.createInitialGameState();
    }

    /**
     * Create initial game state
     */
    private createInitialGameState(): GameState {
        return {
            phase: 'WAITING_FOR_PLAYERS',
            dealerId: null,
            trumpChooserId: null,
            currentTurnId: null,
            vakkaiDecisionIndex: 0,
            trumpSuit: null,
            vakkai: {
                active: false,
                declarerId: null,
                consecutiveWins: 0,
            },
            currentTrick: createTrickState(),
            trickCounts: { A: 0, B: 0 },
            score: createScore(),
            tossCards: new Map(),
            dealerTeam: null,
            trumpTeam: null,
        };
    }

    // ============================================
    // PLAYER MANAGEMENT
    // ============================================

    /**
     * Add a player to the game
     */
    addPlayer(id: PlayerId, name: string): Player | null {
        if (this.players.size >= 4) return null;

        // Find next available seat
        const takenSeats = new Set([...this.players.values()].map(p => p.seat));
        let seat: SeatPosition = 0;
        while (takenSeats.has(seat) && seat < 4) {
            seat = (seat + 1) as SeatPosition;
        }

        const player: Player = {
            id,
            name,
            seat,
            team: getTeamForSeat(seat),
            hand: [],
            isReady: false,
            isConnected: true,
        };

        this.players.set(id, player);
        return player;
    }

    /**
     * Remove a player
     */
    removePlayer(id: PlayerId): boolean {
        return this.players.delete(id);
    }

    /**
     * Get player by ID
     */
    getPlayer(id: PlayerId): Player | undefined {
        return this.players.get(id);
    }

    /**
     * Get player by seat
     */
    getPlayerBySeat(seat: SeatPosition): Player | undefined {
        return [...this.players.values()].find(p => p.seat === seat);
    }

    /**
     * Set player ready status
     */
    setPlayerReady(id: PlayerId, ready: boolean): boolean {
        const player = this.players.get(id);
        if (!player) return false;
        player.isReady = ready;
        return true;
    }

    /**
     * Check if all players are ready
     */
    allPlayersReady(): boolean {
        if (this.players.size !== 4) return false;
        return [...this.players.values()].every(p => p.isReady);
    }

    /**
     * Change a player's team
     */
    changePlayerTeam(id: PlayerId, newTeam: TeamId): boolean {
        const player = this.players.get(id);
        if (!player) return false;

        // Find an available seat on the new team
        const takenSeats = new Set([...this.players.values()].filter(p => p.id !== id).map(p => p.seat));
        const teamSeats: SeatPosition[] = newTeam === 'A' ? [0, 2] : [1, 3];

        const availableSeat = teamSeats.find(seat => !takenSeats.has(seat));
        if (availableSeat === undefined) return false;

        player.team = newTeam;
        player.seat = availableSeat;
        player.isReady = false; // Reset ready status when changing team
        return true;
    }

    // ============================================
    // GAME FLOW
    // ============================================

    /**
     * Start ready check phase
     */
    startReadyCheck(): boolean {
        if (this.players.size !== 4) return false;
        this.stateMachine.transitionTo('READY_CHECK');
        this.gameState.phase = 'READY_CHECK';
        return true;
    }

    /**
     * Perform initial toss to determine dealer/trump teams
     */
    performInitialToss(): { dealerTeam: TeamId; trumpTeam: TeamId; cards: Map<PlayerId, Card> } {
        this.stateMachine.transitionTo('INITIAL_TOSS');
        this.gameState.phase = 'INITIAL_TOSS';

        const tossCards = drawTossCards(4);
        const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);

        const tossCardMap = new Map<PlayerId, Card>();
        players.forEach((player, index) => {
            tossCardMap.set(player.id, tossCards[index]);
        });

        const { teamA, teamB } = calculateTossPoints(tossCards);

        // Lower team deals, higher team gets trump choice
        const dealerTeam: TeamId = teamA <= teamB ? 'A' : 'B';
        const trumpTeam: TeamId = dealerTeam === 'A' ? 'B' : 'A';

        this.gameState.tossCards = tossCardMap;
        this.gameState.dealerTeam = dealerTeam;
        this.gameState.trumpTeam = trumpTeam;

        // Set default dealer (first player of dealer team)
        const dealerPlayer = players.find(p => p.team === dealerTeam);
        this.gameState.dealerId = dealerPlayer!.id;

        // Set trump chooser (player next to dealer)
        const dealerSeat = dealerPlayer!.seat;
        const trumpChooserSeat = ((dealerSeat + 1) % 4) as SeatPosition;
        const trumpChooser = this.getPlayerBySeat(trumpChooserSeat);
        this.gameState.trumpChooserId = trumpChooser!.id;

        return { dealerTeam, trumpTeam, cards: tossCardMap };
    }

    /**
     * Start dealing first 4 cards
     */
    dealFirstHalf(): void {
        this.stateMachine.transitionTo('DEALING_FIRST');
        this.gameState.phase = 'DEALING_FIRST';

        // Create and shuffle deck
        this.deck = shuffleDeck(createDeck());

        // Deal 4 cards to each player
        const { hands, remaining } = dealCards(this.deck, 4, 4);
        this.remainingDeck = remaining;

        // Assign hands to players by seat order
        const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);
        players.forEach((player, index) => {
            player.hand = hands[index];
        });

        // Transition to Vakkai decision
        this.stateMachine.transitionTo('VAKKAI_DECISION');
        this.gameState.phase = 'VAKKAI_DECISION';

        // Set first player to decide (next to dealer)
        const dealer = this.players.get(this.gameState.dealerId!);
        const firstDeciderSeat = ((dealer!.seat + 1) % 4) as SeatPosition;
        const firstDecider = this.getPlayerBySeat(firstDeciderSeat);
        this.gameState.currentTurnId = firstDecider!.id;
        this.gameState.vakkaiDecisionIndex = 0;
    }

    /**
     * Player passes on Vakkai
     */
    passVakkai(playerId: PlayerId): boolean {
        if (this.gameState.phase !== 'VAKKAI_DECISION') return false;
        if (this.gameState.currentTurnId !== playerId) return false;

        this.gameState.vakkaiDecisionIndex++;

        // If all 4 passed, move to Hukum selection
        if (this.gameState.vakkaiDecisionIndex >= 4) {
            this.stateMachine.transitionTo('HUKUM_SELECTION');
            this.gameState.phase = 'HUKUM_SELECTION';
            this.gameState.currentTurnId = this.gameState.trumpChooserId;
        } else {
            // Next player's turn to decide
            const currentPlayer = this.players.get(playerId)!;
            const nextSeat = ((currentPlayer.seat + 1) % 4) as SeatPosition;
            const nextPlayer = this.getPlayerBySeat(nextSeat);
            this.gameState.currentTurnId = nextPlayer!.id;
        }

        return true;
    }

    /**
     * Player declares Vakkai
     */
    declareVakkai(playerId: PlayerId): boolean {
        if (this.gameState.phase !== 'VAKKAI_DECISION') return false;
        if (this.gameState.currentTurnId !== playerId) return false;

        this.gameState.vakkai = {
            active: true,
            declarerId: playerId,
            consecutiveWins: 0,
        };

        this.stateMachine.transitionTo('VAKKAI_PLAY');
        this.gameState.phase = 'VAKKAI_PLAY';
        this.gameState.trumpSuit = null; // No trump in Vakkai

        // NOTE: In Vakkai, we DO NOT deal the second half.
        // The player must win all 4 tricks with the initial 4 cards.

        // Declarer leads first trick
        this.gameState.currentTurnId = playerId;
        this.gameState.currentTrick = createTrickState();

        return true;
    }

    /**
     * Reset match for a new game
     */
    resetMatch(): void {
        this.stateMachine.transitionTo('READY_CHECK');

        // Reset game state
        this.gameState = {
            ...this.createInitialGameState(),
            phase: 'READY_CHECK',
        };

        // Reset player states in the Map
        this.players.forEach(p => {
            p.hand = [];
            p.isReady = false;
            // Keep team and seat
        });
    }

    /**
     * Choose Hukum (trump suit)
     */
    chooseHukum(playerId: PlayerId, suit: Suit): boolean {
        if (this.gameState.phase !== 'HUKUM_SELECTION') return false;
        if (this.gameState.trumpChooserId !== playerId) return false;

        this.gameState.trumpSuit = suit;

        // Deal remaining cards
        this.stateMachine.transitionTo('DEALING_SECOND');
        this.gameState.phase = 'DEALING_SECOND';
        this.dealSecondHalf();

        // Start trick play
        this.stateMachine.transitionTo('TRICK_PLAY');
        this.gameState.phase = 'TRICK_PLAY';

        // Player next to trump chooser leads first trick
        const trumpChooser = this.players.get(playerId)!;
        const firstLeadSeat = ((trumpChooser.seat + 1) % 4) as SeatPosition;
        const firstLead = this.getPlayerBySeat(firstLeadSeat);
        this.gameState.currentTurnId = firstLead!.id;
        this.gameState.currentTrick = createTrickState();

        return true;
    }

    /**
     * Deal second half of cards
     */
    private dealSecondHalf(): void {
        const { hands } = dealCards(this.remainingDeck, 4, 4);

        const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);
        players.forEach((player, index) => {
            player.hand = [...player.hand, ...hands[index]];
        });

        this.remainingDeck = [];
    }

    /**
     * Play a card
     */
    playCard(playerId: PlayerId, cardId: string): { success: boolean; error?: string } {
        const phase = this.gameState.phase;
        if (phase !== 'TRICK_PLAY' && phase !== 'VAKKAI_PLAY') {
            return { success: false, error: 'Not in trick play phase' };
        }

        if (this.gameState.currentTurnId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        const player = this.players.get(playerId)!;
        const card = player.hand.find(c => c.id === cardId);

        if (!card) {
            return { success: false, error: 'Card not in hand' };
        }

        // Validate follow suit
        if (this.gameState.currentTrick.leadSuit) {
            const hasLeadSuit = player.hand.some(c => c.suit === this.gameState.currentTrick.leadSuit);
            if (hasLeadSuit && card.suit !== this.gameState.currentTrick.leadSuit) {
                return { success: false, error: `Must follow suit (${this.gameState.currentTrick.leadSuit})` };
            }
        }

        // Remove card from hand
        player.hand = player.hand.filter(c => c.id !== cardId);

        // Add to trick
        this.gameState.currentTrick = addCardToTrick(this.gameState.currentTrick, playerId, card);

        // Check if trick is complete
        const isVakkai = this.gameState.vakkai.active;
        if (isTrickComplete(this.gameState.currentTrick, isVakkai)) {
            this.resolveTrick();
        } else {
            this.advanceToNextPlayer();
        }

        return { success: true };
    }

    /**
     * Advance to the next player
     */
    private advanceToNextPlayer(): void {
        const currentPlayer = this.players.get(this.gameState.currentTurnId!)!;
        const isVakkai = this.gameState.vakkai.active;

        if (isVakkai) {
            // Vakkai turn order: declarer → opponents (skip partner)
            const declarerSeat = this.players.get(this.gameState.vakkai.declarerId!)!.seat;
            const turnOrder = getTrickTurnOrder(declarerSeat, true, declarerSeat);
            const currentTurnIndex = turnOrder.indexOf(currentPlayer.seat);
            const nextSeat = turnOrder[(currentTurnIndex + 1) % turnOrder.length] as SeatPosition;
            const nextPlayer = this.getPlayerBySeat(nextSeat);
            this.gameState.currentTurnId = nextPlayer!.id;
        } else {
            // Normal clockwise
            const nextSeat = ((currentPlayer.seat + 1) % 4) as SeatPosition;
            const nextPlayer = this.getPlayerBySeat(nextSeat);
            this.gameState.currentTurnId = nextPlayer!.id;
        }
    }

    /**
     * Resolve completed trick
     */
    private resolveTrick(): { winnerId: PlayerId; team: TeamId; handEnd?: { team: TeamId; points: number; reason: string } } {
        const winnerId = calculateTrickWinner(this.gameState.currentTrick, this.gameState.trumpSuit)!;
        const winner = this.players.get(winnerId)!;
        const team = winner.team;

        this.gameState.trickCounts[team]++;

        const isVakkai = this.gameState.vakkai.active;

        if (isVakkai) {
            return this.resolveVakkaiTrick(winnerId, team);
        } else {
            return this.resolveNormalTrick(winnerId, team);
        }
    }

    /**
     * Resolve Vakkai trick
     */
    private resolveVakkaiTrick(winnerId: PlayerId, team: TeamId): { winnerId: PlayerId; team: TeamId; handEnd?: { team: TeamId; points: number; reason: string } } {
        const declarerId = this.gameState.vakkai.declarerId!;
        const declarerTeam = this.players.get(declarerId)!.team;

        if (winnerId === declarerId) {
            // Declarer won this trick
            this.gameState.vakkai.consecutiveWins++;

            if (this.gameState.vakkai.consecutiveWins >= SCORING.VAKKAI_TARGET) {
                // Vakkai success!
                const result = calculateVakkaiResult(this.gameState.vakkai.consecutiveWins, declarerTeam);
                this.gameState.score = applyScore(this.gameState.score, result.winnerTeam, result.points);

                return this.endHand(result.winnerTeam, result.points, 'Vakkai success - won 4 consecutive tricks');
            }

            // Continue - declarer leads next trick
            this.gameState.currentTrick = createTrickState();
            this.gameState.currentTurnId = declarerId;
        } else {
            // Declarer lost - Vakkai failure
            const result = calculateVakkaiResult(0, declarerTeam);
            this.gameState.score = applyScore(this.gameState.score, result.winnerTeam, result.points);

            return this.endHand(result.winnerTeam, result.points, 'Vakkai failure - lost a trick');
        }

        return { winnerId, team };
    }

    /**
     * Resolve normal trick
     */
    private resolveNormalTrick(winnerId: PlayerId, team: TeamId): { winnerId: PlayerId; team: TeamId; handEnd?: { team: TeamId; points: number; reason: string } } {
        // Check if hand is won
        const handResult = checkHandWinner(
            this.gameState.trickCounts,
            this.gameState.trumpTeam!,
            this.gameState.dealerTeam!
        );

        if (handResult) {
            this.gameState.score = applyScore(this.gameState.score, handResult.team, handResult.points);
            return this.endHand(handResult.team, handResult.points, handResult.reason);
        }

        // Continue - winner leads next trick
        this.gameState.currentTrick = createTrickState();
        this.gameState.currentTurnId = winnerId;

        return { winnerId, team };
    }

    /**
     * End the current hand
     */
    private endHand(winnerTeam: TeamId, points: number, reason: string): { winnerId: PlayerId; team: TeamId; handEnd: { team: TeamId; points: number; reason: string } } {
        // Check if match ends
        if (isMatchEnd(this.gameState.score)) {
            this.stateMachine.transitionTo('MATCH_END');
            this.gameState.phase = 'MATCH_END';
        } else {
            this.stateMachine.transitionTo('HAND_END');
            this.gameState.phase = 'HAND_END';

            // Determine who chooses dealer
            const choosingTeam = getDealerChoosingTeam(this.gameState.score);
            this.gameState.dealerTeam = choosingTeam;
            this.gameState.trumpTeam = getOppositeTeam(choosingTeam);
        }

        return {
            winnerId: '',
            team: winnerTeam,
            handEnd: { team: winnerTeam, points, reason },
        };
    }

    /**
     * Transition from HAND_END to DEALER_SELECTION
     */
    transitionToDealerSelection(): void {
        if (this.gameState.phase !== 'HAND_END') return;

        this.stateMachine.transitionTo('DEALER_SELECTION');
        this.gameState.phase = 'DEALER_SELECTION';
    }

    /**
     * Select dealer for next hand
     */
    selectDealer(dealerId: PlayerId): boolean {
        if (this.gameState.phase !== 'HAND_END' && this.gameState.phase !== 'DEALER_SELECTION') return false;

        const dealer = this.players.get(dealerId);
        if (!dealer) return false;

        // Verify player is on the dealer-choosing team
        const choosingTeam = getDealerChoosingTeam(this.gameState.score);
        if (dealer.team !== choosingTeam) return false;

        this.gameState.dealerId = dealerId;

        // Set trump chooser
        const trumpChooserSeat = ((dealer.seat + 1) % 4) as SeatPosition;
        const trumpChooser = this.getPlayerBySeat(trumpChooserSeat);
        this.gameState.trumpChooserId = trumpChooser!.id;

        // Reset for new hand
        this.resetForNewHand();

        return true;
    }

    /**
     * Reset state for new hand
     */
    private resetForNewHand(): void {
        this.gameState.vakkai = {
            active: false,
            declarerId: null,
            consecutiveWins: 0,
        };
        this.gameState.vakkaiDecisionIndex = 0;
        this.gameState.trumpSuit = null;
        this.gameState.currentTrick = createTrickState();
        this.gameState.trickCounts = { A: 0, B: 0 };

        // Clear hands
        for (const player of this.players.values()) {
            player.hand = [];
        }

        // Go to dealing
        this.stateMachine.forcePhase('DEALING_FIRST');
        this.dealFirstHalf();
    }

    // ============================================
    // STATE ACCESS
    // ============================================

    /**
     * Get current game phase
     */
    getPhase(): GamePhase {
        return this.gameState.phase;
    }

    /**
     * Get full game state
     */
    getGameState(): GameState {
        return this.gameState;
    }

    /**
     * Get public game state (no private info)
     */
    getPublicState(): PublicGameState {
        return {
            phase: this.gameState.phase,
            dealerId: this.gameState.dealerId,
            trumpChooserId: this.gameState.trumpChooserId,
            currentTurnId: this.gameState.currentTurnId,
            trumpSuit: this.gameState.trumpSuit,
            vakkai: this.gameState.vakkai,
            currentTrick: this.gameState.currentTrick,
            trickCounts: this.gameState.trickCounts,
            score: this.gameState.score,
            players: [...this.players.values()].map(p => ({
                id: p.id,
                name: p.name,
                seat: p.seat,
                team: p.team,
                cardCount: p.hand.length,
                isReady: p.isReady,
                isConnected: p.isConnected,
            })),
        };
    }

    /**
     * Get a player's hand
     */
    getPlayerHand(playerId: PlayerId): Card[] {
        const player = this.players.get(playerId);
        return player ? player.hand : [];
    }

    /**
     * Get all players
     */
    getAllPlayers(): Player[] {
        return [...this.players.values()];
    }
}

/**
 * Create a new game engine instance
 */
export function createGameEngine(): GameEngine {
    return new GameEngine();
}
