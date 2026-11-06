// ============================================
// HUKUM GAME - TYPE DEFINITIONS
// ============================================

// --- Card Types ---

export type Suit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';

export interface Card {
    suit: Suit;
    rank: Rank;
    id: string; // e.g., "SPADE_A"
}

// Rank values for comparison (higher = stronger)
export const RANK_VALUES: Record<Rank, number> = {
    'A': 8,
    'K': 7,
    'Q': 6,
    'J': 5,
    '10': 4,
    '9': 3,
    '8': 2,
    '7': 1,
};

export const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

// --- Player & Team Types ---

export type PlayerId = string;
export type SeatPosition = 0 | 1 | 2 | 3; // P1, P2, P3, P4
export type TeamId = 'A' | 'B';

export interface Player {
    id: PlayerId;
    name: string;
    seat: SeatPosition;
    team: TeamId;
    hand: Card[];
    isReady: boolean;
    isConnected: boolean;
    wantsSwitch: boolean; // For team switch requests after 4 players join
    isBot: boolean; // Server-controlled player (no socket)
}

// Team A = seats 0, 2 (P1, P3)
// Team B = seats 1, 3 (P2, P4)
export function getTeamForSeat(seat: SeatPosition): TeamId {
    return seat % 2 === 0 ? 'A' : 'B';
}

// --- Game Phase Types ---

export type GamePhase =
    | 'WAITING_FOR_PLAYERS'
    | 'READY_CHECK'
    | 'INITIAL_TOSS'
    | 'DEALING_FIRST'
    | 'VAKKAI_DECISION'
    | 'HUKUM_SELECTION'
    | 'DEALING_SECOND'
    | 'TRICK_PLAY'
    | 'VAKKAI_PLAY'
    | 'HAND_END'
    | 'DEALER_SELECTION'
    | 'MATCH_END';

// --- Vakkai State ---

export interface VakkaiState {
    active: boolean;
    declarerId: PlayerId | null;
    consecutiveWins: number;
}

// --- Trick State ---

export interface TrickCard {
    playerId: PlayerId;
    card: Card;
}

export interface TrickState {
    cards: TrickCard[];
    leadSuit: Suit | null;
    winnerId: PlayerId | null;
}

// --- Score State ---

export interface Score {
    A: number;
    B: number;
}

// --- Room State ---

export interface Room {
    code: string;
    players: Map<PlayerId, Player>;
    gameState: GameState | null;
    createdAt: Date;
}

// --- Full Game State ---

export interface GameState {
    phase: GamePhase;

    // Players
    dealerId: PlayerId | null;
    trumpChooserId: PlayerId | null;
    currentTurnId: PlayerId | null;

    // Vakkai decision tracking
    vakkaiDecisionIndex: number; // 0-3, tracks who's deciding

    // Trump
    trumpSuit: Suit | null;

    // Vakkai
    vakkai: VakkaiState;

    // Current trick
    currentTrick: TrickState;

    // Trick counts for current hand
    trickCounts: Record<TeamId, number>;

    // Match score
    score: Score;

    // Opening toss (null outside INITIAL_TOSS)
    toss: TossState | null;

    // Dealer team (for scoring purposes)
    dealerTeam: TeamId | null;
    trumpTeam: TeamId | null;

    /** Team that was below zero before the last hand (decides the dealer at 0 : 0) */
    lastNegativeTeam: TeamId | null;

    /** Seat of each team's most recent dealer; teammates take turns dealing (reset every match) */
    lastDealerSeat: Record<TeamId, SeatPosition | null>;
}

// --- Opening toss ---

/** Face-down cards spread on the table during the toss */
export const TOSS_SLOTS = 12;
/** Time to pick before the server picks for you */
export const TOSS_PICK_MS = 10_000;

export interface TossState {
    round: number;
    /** Cards under each spread slot (server only until revealed) */
    deck: Card[];
    /** Slot picked by each player */
    picks: Map<PlayerId, number>;
    /** Epoch ms when unpicked players get a random card */
    deadline: number;
    totals: Record<TeamId, number> | null;
    /** Team that deals, or TIE (everyone draws again); null until all 4 have picked */
    result: TeamId | 'TIE' | null;
}

export interface PublicToss {
    round: number;
    slots: number;
    picks: Record<PlayerId, number>;
    /** Revealed only once all four have picked */
    cards: Record<PlayerId, Card> | null;
    totals: Record<TeamId, number> | null;
    result: TeamId | 'TIE' | null;
    /** Time left to pick, measured when this state was sent */
    msLeft: number;
}

// --- Client -> Server Messages ---

export type ClientMessage =
    | { type: 'CREATE_ROOM'; playerName: string; team: TeamId }
    | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; team: TeamId }
    | { type: 'TOGGLE_SWITCH_REQUEST' }
    | { type: 'ADD_BOT'; team: TeamId }
    | { type: 'REMOVE_BOT'; botId: PlayerId }
    | { type: 'READY' }
    | { type: 'PASS_VAKKAI' }
    | { type: 'DECLARE_VAKKAI' }
    | { type: 'CHOOSE_HUKUM'; suit: Suit }
    | { type: 'PLAY_CARD'; cardId: string }
    | { type: 'SELECT_DEALER'; dealerId: PlayerId }
    | { type: 'TOSS_PICK'; slot: number }
    | { type: 'SEND_MESSAGE'; text: string }
    | { type: 'NEW_GAME' }
    | { type: 'GO_HOME' };

// --- Server -> Client Messages ---

export type ServerMessage =
    | { type: 'ROOM_CREATED'; roomCode: string; playerId: PlayerId; seat: SeatPosition }
    | { type: 'ROOM_JOINED'; roomCode: string; playerId: PlayerId; seat: SeatPosition }
    | { type: 'PLAYER_JOINED'; player: Omit<Player, 'hand'> }
    | { type: 'PLAYER_LEFT'; playerId: PlayerId }
    | { type: 'PLAYER_READY'; playerId: PlayerId }
    | { type: 'SWITCH_REQUEST_UPDATED'; playerId: PlayerId; wantsSwitch: boolean }
    | { type: 'TEAMS_SWAPPED'; player1Id: PlayerId; player2Id: PlayerId }
    | { type: 'GAME_STATE'; state: PublicGameState }
    | { type: 'PRIVATE_CARDS'; cards: Card[] }
    | { type: 'VAKKAI_DECLARED'; playerId: PlayerId }
    | { type: 'VAKKAI_PASSED'; playerId: PlayerId }
    | { type: 'HUKUM_CHOSEN'; suit: Suit; chooserId: PlayerId }
    | { type: 'CARD_PLAYED'; playerId: PlayerId; card: Card }
    | { type: 'TRICK_WINNER'; winnerId: PlayerId; team: TeamId }
    | { type: 'HAND_END'; winnerTeam: TeamId; points: number; reason: string }
    | { type: 'MATCH_END'; winnerTeam: TeamId; finalScore: Score }
    | { type: 'DEALER_SELECTION_REQUIRED'; team: TeamId; options: PlayerId[] }
    | { type: 'CHAT_MESSAGE'; playerId: PlayerId; playerName: string; text: string }
    | { type: 'ERROR'; message: string }
    | { type: 'GO_HOME' };

// Public game state (no private card info)
export interface PublicGameState {
    phase: GamePhase;
    dealerId: PlayerId | null;
    trumpChooserId: PlayerId | null;
    currentTurnId: PlayerId | null;
    trumpSuit: Suit | null;
    vakkai: VakkaiState;
    currentTrick: TrickState;
    trickCounts: Record<TeamId, number>;
    score: Score;
    players: Array<{
        id: PlayerId;
        name: string;
        seat: SeatPosition;
        team: TeamId;
        cardCount: number;
        isReady: boolean;
        isConnected: boolean;
        wantsSwitch: boolean;
        isBot: boolean;
    }>;
    dealerTeam: TeamId | null;
    trumpTeam: TeamId | null;
    toss: PublicToss | null;
}
