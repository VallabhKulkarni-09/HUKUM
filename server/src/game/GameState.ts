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
    PublicToss,
    TossState,
    TOSS_SLOTS,
    TOSS_PICK_MS,
    getTeamForSeat,
} from '../types.js';
import { StateMachine, createStateMachine } from './StateMachine.js';
import { createTrickState, addCardToTrick, calculateTrickWinner, isTrickComplete, getTrickTurnOrder } from './TrickLogic.js';
import { createScore, applyScore, checkHandWinner, calculateVakkaiResult, isMatchEnd, getDealerChoosingTeam, getOppositeTeam, SCORING } from './Scoring.js';
import { createDeck, shuffleDeck, dealCards, createTossSpread, scoreToss } from './Deck.js';
import { getCardValue, isVakkaiEligible } from './Card.js';

/**
 * Full game engine class
 */
export class GameEngine {
    private stateMachine: StateMachine;
    private players: Map<PlayerId, Player>;
    private gameState: GameState;
    private deck: Card[];
    private remainingDeck: Card[];
    /** Score when the current hand was dealt (to know who climbed back to 0) */
    private handStartScore: Score = { A: 0, B: 0 };
    /** When the current hand's first 4 cards were dealt (ms since epoch); used for pacing only */
    private firstDealAt = 0;

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
            toss: null,
            dealerTeam: null,
            trumpTeam: null,
            lastNegativeTeam: null,
            lastDealerSeat: { A: null, B: null },
        };
    }

    // ============================================
    // PLAYER MANAGEMENT
    // ============================================

    /**
     * Add a player to the game with specified team
     */
    addPlayer(id: PlayerId, name: string, team?: TeamId, isBot: boolean = false): Player | null {
        if (this.players.size >= 4) return null;

        // Count players per team
        const teamCounts = { A: 0, B: 0 };
        for (const p of this.players.values()) {
            teamCounts[p.team]++;
        }

        // If team specified, check if it's available
        let assignedTeam: TeamId;
        if (team) {
            if (teamCounts[team] >= 2) {
                return null; // Team is full
            }
            assignedTeam = team;
        } else {
            // Auto-assign to team with fewer players
            assignedTeam = teamCounts.A <= teamCounts.B ? 'A' : 'B';
        }

        // Find available seat on the assigned team
        const takenSeats = new Set([...this.players.values()].map(p => p.seat));
        const teamSeats: SeatPosition[] = assignedTeam === 'A' ? [0, 2] : [1, 3];
        const availableSeat = teamSeats.find(seat => !takenSeats.has(seat));

        if (availableSeat === undefined) return null;

        const player: Player = {
            id,
            name,
            seat: availableSeat,
            team: assignedTeam,
            hand: [],
            isReady: isBot, // Bots are always ready
            isConnected: true,
            wantsSwitch: false,
            isBot,
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
     * Check if all players are ready and teams are balanced
     */
    allPlayersReady(): boolean {
        if (this.players.size !== 4) return false;

        // Check teams are balanced (2v2)
        const teamCounts = { A: 0, B: 0 };
        for (const p of this.players.values()) {
            teamCounts[p.team]++;
        }

        if (teamCounts.A !== 2 || teamCounts.B !== 2) return false;

        return [...this.players.values()].every(p => p.isReady);
    }

    /**
     * Toggle switch request for a player
     */
    toggleSwitchRequest(id: PlayerId): boolean {
        const player = this.players.get(id);
        if (!player) return false;

        // Only allow during WAITING_FOR_PLAYERS or READY_CHECK with 4 players
        if (this.gameState.phase !== 'WAITING_FOR_PLAYERS' && this.gameState.phase !== 'READY_CHECK') {
            return false;
        }

        if (this.players.size !== 4) return false;

        player.wantsSwitch = !player.wantsSwitch;

        // Check if we can perform a swap
        if (player.wantsSwitch) {
            this.checkAndPerformSwap(id);
        }

        return true;
    }

    /**
     * Check if there's a matching switch request and perform swap
     */
    private checkAndPerformSwap(playerId: PlayerId): { swapped: boolean; partnerId?: PlayerId } {
        const player = this.players.get(playerId);
        if (!player || !player.wantsSwitch) return { swapped: false };

        // Find a player from opposite team who also wants to switch
        const oppositeTeam = player.team === 'A' ? 'B' : 'A';
        const partner = [...this.players.values()].find(
            p => p.team === oppositeTeam && p.wantsSwitch && p.id !== playerId
        );

        if (partner) {
            // Perform the swap
            this.swapPlayers(player.id, partner.id);
            return { swapped: true, partnerId: partner.id };
        }

        return { swapped: false };
    }

    /**
     * Swap two players' teams and seats
     */
    private swapPlayers(player1Id: PlayerId, player2Id: PlayerId): void {
        const player1 = this.players.get(player1Id);
        const player2 = this.players.get(player2Id);

        if (!player1 || !player2) return;

        // Swap teams and seats
        const tempTeam = player1.team;
        const tempSeat = player1.seat;

        player1.team = player2.team;
        player1.seat = player2.seat;

        player2.team = tempTeam;
        player2.seat = tempSeat;

        // Reset switch requests and ready status
        player1.wantsSwitch = false;
        player2.wantsSwitch = false;
        player1.isReady = false;
        player2.isReady = false;
    }

    /**
     * Get swap result for a player
     */
    getSwapResult(playerId: PlayerId): { swapped: boolean; partnerId?: PlayerId } {
        return this.checkAndPerformSwap(playerId);
    }

    /**
     * Change a player's team (REMOVED - replaced with toggle switch)
     */
    changePlayerTeam(id: PlayerId, newTeam: TeamId): boolean {
        // This function is deprecated but kept for compatibility
        return false;
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

    // ============================================
    // OPENING TOSS
    // All four players pick a face-down card from a shuffled spread at the same
    // time. Card values are added per team; the lower team deals. Equal totals:
    // everyone draws again from a new spread.
    // ============================================

    /** READY_CHECK -> INITIAL_TOSS: lay out the first spread */
    startToss(now: number = Date.now()): void {
        this.stateMachine.transitionTo('INITIAL_TOSS');
        this.gameState.phase = 'INITIAL_TOSS';
        this.gameState.currentTurnId = null;
        this.gameState.dealerId = null;
        this.gameState.trumpChooserId = null;
        this.gameState.dealerTeam = null;
        this.gameState.trumpTeam = null;
        // New match: dealing turns start over
        this.gameState.lastDealerSeat = { A: null, B: null };
        for (const p of this.players.values()) p.hand = [];
        this.gameState.toss = this.newTossRound(1, now);
    }

    private newTossRound(round: number, now: number): TossState {
        return {
            round,
            deck: createTossSpread(TOSS_SLOTS),
            picks: new Map(),
            deadline: now + TOSS_PICK_MS,
            totals: null,
            result: null,
        };
    }

    /** Record a pick. Returns false if it isn't allowed (wrong phase, slot taken, already picked). */
    pickTossCard(playerId: PlayerId, slot: number): boolean {
        const toss = this.gameState.toss;
        if (this.gameState.phase !== 'INITIAL_TOSS' || !toss || toss.result) return false;
        if (!this.players.has(playerId) || toss.picks.has(playerId)) return false;
        if (!Number.isInteger(slot) || slot < 0 || slot >= toss.deck.length) return false;
        if ([...toss.picks.values()].includes(slot)) return false;

        toss.picks.set(playerId, slot);

        if (toss.picks.size === this.players.size) {
            const { totals, result } = scoreToss(
                [...toss.picks].map(([id, s]) => ({ team: this.players.get(id)!.team, card: toss.deck[s] })),
            );
            toss.totals = totals;
            toss.result = result;
        }
        return true;
    }

    /** Pick a random free slot for a player (bot, disconnected, or out of time). */
    autoPickTossCard(playerId: PlayerId): boolean {
        const toss = this.gameState.toss;
        if (!toss || toss.result || toss.picks.has(playerId)) return false;
        const taken = new Set(toss.picks.values());
        const free = toss.deck.map((_, i) => i).filter(i => !taken.has(i));
        if (free.length === 0) return false;
        return this.pickTossCard(playerId, free[Math.floor(Math.random() * free.length)]);
    }

    /** Players who still have to pick in the current toss round */
    getTossPending(): PlayerId[] {
        const toss = this.gameState.toss;
        if (!toss || toss.result) return [];
        return [...this.players.keys()].filter(id => !toss.picks.has(id));
    }

    /** Equal totals: deal a new spread and everyone draws again */
    redoToss(now: number = Date.now()): boolean {
        const toss = this.gameState.toss;
        if (this.gameState.phase !== 'INITIAL_TOSS' || toss?.result !== 'TIE') return false;
        this.gameState.toss = this.newTossRound(toss.round + 1, now);
        return true;
    }

    /** Lower team deals: pick a random dealer from it and deal the first 4 cards */
    finishToss(): boolean {
        const toss = this.gameState.toss;
        if (this.gameState.phase !== 'INITIAL_TOSS' || !toss || (toss.result !== 'A' && toss.result !== 'B')) return false;

        this.gameState.dealerTeam = toss.result;
        this.gameState.trumpTeam = getOppositeTeam(toss.result);
        this.gameState.toss = null;
        this.setTeamDealer(toss.result);
        this.dealFirstHalf();
        return true;
    }

    /**
     * Dealer from `team`. Teammates take turns: whoever did not deal the team's
     * last hand deals now. A team's first deal of the match goes to a random member.
     * The Hukum chooser sits in the next seat.
     */
    getFirstDealAt(): number {
        return this.firstDealAt;
    }

    private setTeamDealer(team: TeamId): Player | null {
        const options = [...this.players.values()].filter(p => p.team === team);
        if (options.length === 0) return null;
        const last = this.gameState.lastDealerSeat[team];
        const others = options.filter(p => p.seat !== last);
        const pool = last !== null && others.length > 0 ? others : options;
        const dealer = pool[Math.floor(Math.random() * pool.length)];
        this.setDealer(dealer);
        return dealer;
    }

    /** Make `dealer` the dealer and remember them for the team's turn order */
    private setDealer(dealer: Player): void {
        this.gameState.dealerId = dealer.id;
        this.gameState.lastDealerSeat[dealer.team] = dealer.seat;
        const trumpChooser = this.getPlayerBySeat(((dealer.seat + 1) % 4) as SeatPosition);
        this.gameState.trumpChooserId = trumpChooser!.id;
    }

    /**
     * Start dealing first 4 cards
     */
    dealFirstHalf(): void {
        this.stateMachine.transitionTo('DEALING_FIRST');
        this.gameState.phase = 'DEALING_FIRST';

        this.handStartScore = { ...this.gameState.score };
        this.firstDealAt = Date.now();

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

        // Sort all player hands
        this.sortAllHands();

        // Transition to Vakkai decision
        this.stateMachine.transitionTo('VAKKAI_DECISION');
        this.gameState.phase = 'VAKKAI_DECISION';

        // Ask the first eligible player, starting next to the dealer
        this.gameState.vakkaiDecisionIndex = 0;
        this.moveToNextVakkaiDecider();
    }

    /**
     * Give the Vakkai decision to the next eligible player (3 of one suit + 1 of
     * another), starting at vakkaiDecisionIndex. Ineligible players are skipped
     * without being asked. If nobody is left, move on to Hukum selection.
     */
    private moveToNextVakkaiDecider(): void {
        const dealerSeat = this.players.get(this.gameState.dealerId!)!.seat;

        while (this.gameState.vakkaiDecisionIndex < 4) {
            const seat = ((dealerSeat + 1 + this.gameState.vakkaiDecisionIndex) % 4) as SeatPosition;
            const player = this.getPlayerBySeat(seat);
            if (player && isVakkaiEligible(player.hand)) {
                this.gameState.currentTurnId = player.id;
                return;
            }
            this.gameState.vakkaiDecisionIndex++;
        }

        // No (remaining) eligible players: go to Hukum selection
        this.stateMachine.transitionTo('HUKUM_SELECTION');
        this.gameState.phase = 'HUKUM_SELECTION';
        this.gameState.currentTurnId = this.gameState.trumpChooserId;
    }

    /**
     * Player passes on Vakkai
     */
    passVakkai(playerId: PlayerId): boolean {
        if (this.gameState.phase !== 'VAKKAI_DECISION') return false;
        if (this.gameState.currentTurnId !== playerId) return false;

        this.gameState.vakkaiDecisionIndex++;
        this.moveToNextVakkaiDecider();

        return true;
    }

    /**
     * Player declares Vakkai
     */
    declareVakkai(playerId: PlayerId): boolean {
        if (this.gameState.phase !== 'VAKKAI_DECISION') return false;
        if (this.gameState.currentTurnId !== playerId) return false;

        // Hand must be exactly 3 cards of one suit + 1 card of another
        const player = this.players.get(playerId);
        if (!player || !isVakkaiEligible(player.hand)) return false;

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
            p.isReady = p.isBot; // Bots stay ready
            // Keep team and seat
        });
    }

    /**
     * Force reset to WAITING_FOR_PLAYERS (bypasses state machine).
     * Used when a player disconnects mid-game.
     */
    forceReset(): void {
        this.stateMachine.forcePhase('WAITING_FOR_PLAYERS');

        this.gameState = {
            ...this.createInitialGameState(),
            phase: 'WAITING_FOR_PLAYERS',
        };

        this.players.forEach(p => {
            p.hand = [];
            p.isReady = p.isBot; // Bots stay ready
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

        // Sort all player hands
        this.sortAllHands();

        this.remainingDeck = [];
    }

    /**
     * Play a card. Does NOT auto-resolve trick — caller must check trickComplete
     * and call resolveTrick() after a delay.
     */
    playCard(playerId: PlayerId, cardId: string): { success: boolean; error?: string; trickComplete?: boolean } {
        const phase = this.gameState.phase;
        if (phase !== 'TRICK_PLAY' && phase !== 'VAKKAI_PLAY') {
            return { success: false, error: 'Not in trick play phase' };
        }

        if (this.gameState.currentTurnId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        // Trick is full and waiting to be resolved — no more cards allowed
        if (isTrickComplete(this.gameState.currentTrick, this.gameState.vakkai.active)) {
            return { success: false, error: 'Trick is being resolved' };
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
            return { success: true, trickComplete: true };
        } else {
            this.advanceToNextPlayer();
            return { success: true, trickComplete: false };
        }
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
     * Resolve completed trick (public — called after a delay by MessageHandler)
     */
    resolveTrick(): { winnerId: PlayerId; team: TeamId; handEnd?: { team: TeamId; points: number; reason: string } } {
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

            // Remember who was below zero before this hand (decides the dealer at 0 : 0)
            const before = this.handStartScore;
            if (before.A < 0) this.gameState.lastNegativeTeam = 'A';
            else if (before.B < 0) this.gameState.lastNegativeTeam = 'B';

            // Team that deals next
            const choosingTeam = getDealerChoosingTeam(this.gameState.score, this.gameState.lastNegativeTeam, this.gameState.dealerTeam ?? 'A');
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
     * Automatically select dealer from the dealer-choosing team
     */
    autoSelectDealer(): boolean {
        if (this.gameState.phase !== 'HAND_END' && this.gameState.phase !== 'DEALER_SELECTION') return false;

        // endHand already decided which team deals
        const choosingTeam = this.gameState.dealerTeam
            ?? getDealerChoosingTeam(this.gameState.score, this.gameState.lastNegativeTeam);

        const dealer = this.setTeamDealer(choosingTeam);
        if (!dealer) return false;
        console.log(`[DEALER] Dealer: ${dealer.name} (Team ${choosingTeam}, seat ${dealer.seat})`);

        // Reset for new hand
        this.resetForNewHand();

        return true;
    }

    /**
     * Select dealer for next hand (manual selection - kept for compatibility)
     */
    selectDealer(dealerId: PlayerId): boolean {
        if (this.gameState.phase !== 'HAND_END' && this.gameState.phase !== 'DEALER_SELECTION') return false;

        const dealer = this.players.get(dealerId);
        if (!dealer) return false;

        // Verify player is on the dealer-choosing team
        const choosingTeam = this.gameState.dealerTeam
            ?? getDealerChoosingTeam(this.gameState.score, this.gameState.lastNegativeTeam);
        if (dealer.team !== choosingTeam) return false;

        this.setDealer(dealer);

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

        // Go to dealing — use DEALER_SELECTION so dealFirstHalf can transition to DEALING_FIRST
        this.stateMachine.forcePhase('DEALER_SELECTION');
        this.dealFirstHalf();
    }

    /**
     * Sort cards in a hand by suit order (SPADE, HEART, DIAMOND, CLUB) then by rank (high to low)
     */
    private sortAllHands(): void {
        const SUIT_ORDER: Record<string, number> = { 'SPADE': 0, 'HEART': 1, 'DIAMOND': 2, 'CLUB': 3 };

        for (const player of this.players.values()) {
            player.hand.sort((a, b) => {
                const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
                if (suitDiff !== 0) return suitDiff;
                return getCardValue(b) - getCardValue(a); // High rank first
            });
        }
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
                wantsSwitch: p.wantsSwitch,
                isBot: p.isBot,
            })),
            dealerTeam: this.gameState.dealerTeam,
            trumpTeam: this.gameState.trumpTeam,
            toss: this.getPublicToss(),
        };
    }

    /** Toss as seen by clients: which slots are taken; cards only once everyone has picked */
    private getPublicToss(now: number = Date.now()): PublicToss | null {
        const toss = this.gameState.toss;
        if (!toss) return null;
        const picks: Record<PlayerId, number> = {};
        for (const [id, slot] of toss.picks) picks[id] = slot;
        let cards: Record<PlayerId, Card> | null = null;
        if (toss.result) {
            cards = {};
            for (const [id, slot] of toss.picks) cards[id] = toss.deck[slot];
        }
        return {
            round: toss.round,
            slots: toss.deck.length,
            picks,
            cards,
            totals: toss.totals,
            result: toss.result,
            msLeft: toss.result ? 0 : Math.max(0, toss.deadline - now),
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

    /**
     * Get valid cards a player can play (follows suit rules)
     */
    getValidCards(playerId: PlayerId): Card[] {
        const player = this.players.get(playerId);
        if (!player || player.hand.length === 0) return [];

        const leadSuit = this.gameState.currentTrick.leadSuit;
        if (!leadSuit) {
            // Leading the trick — any card is valid
            return [...player.hand];
        }

        // Must follow suit if possible
        const suitCards = player.hand.filter(c => c.suit === leadSuit);
        if (suitCards.length > 0) return suitCards;

        // Can't follow suit — any card is valid
        return [...player.hand];
    }

    /**
     * Auto-play a random valid card for a disconnected player.
     * Returns the played card and trickComplete flag, or null if unable.
     */
    autoPlayCard(playerId: PlayerId): { card: Card; trickComplete: boolean } | null {
        const validCards = this.getValidCards(playerId);
        if (validCards.length === 0) return null;

        const card = validCards[Math.floor(Math.random() * validCards.length)];
        const result = this.playCard(playerId, card.id);
        if (result.success) return { card, trickComplete: result.trickComplete || false };
        return null;
    }

    /**
     * True if at least one human player is still connected
     */
    hasConnectedHumans(): boolean {
        return [...this.players.values()].some(p => !p.isBot && p.isConnected);
    }

    /**
     * Find first disconnected player on a team (for rejoin)
     */
    getDisconnectedPlayerOnTeam(team: TeamId): Player | undefined {
        return [...this.players.values()].find(p => p.team === team && !p.isConnected);
    }

    /**
     * Reconnect: swap old player ID with new one, preserving hand/seat/team.
     * Returns the reconnected player or null.
     */
    reconnectPlayer(oldId: PlayerId, newId: PlayerId, newName: string): Player | null {
        const player = this.players.get(oldId);
        if (!player) return null;

        // Update player identity
        player.id = newId;
        player.name = newName;
        player.isConnected = true;

        // Re-key in the map
        this.players.delete(oldId);
        this.players.set(newId, player);

        // Update any game state references to old ID
        if (this.gameState.dealerId === oldId) this.gameState.dealerId = newId;
        if (this.gameState.trumpChooserId === oldId) this.gameState.trumpChooserId = newId;
        if (this.gameState.currentTurnId === oldId) this.gameState.currentTurnId = newId;
        if (this.gameState.vakkai.declarerId === oldId) this.gameState.vakkai.declarerId = newId;

        // Update toss pick
        const toss = this.gameState.toss;
        if (toss?.picks.has(oldId)) {
            toss.picks.set(newId, toss.picks.get(oldId)!);
            toss.picks.delete(oldId);
        }

        // Update trick cards
        for (const tc of this.gameState.currentTrick.cards) {
            if (tc.playerId === oldId) tc.playerId = newId;
        }

        return player;
    }
}

/**
 * Create a new game engine instance
 */
export function createGameEngine(): GameEngine {
    return new GameEngine();
}
