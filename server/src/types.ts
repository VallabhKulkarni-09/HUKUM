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

    // Initial toss data
    tossCards: Map<PlayerId, Card>;

    // Dealer team (for scoring purposes)
    dealerTeam: TeamId | null;
    trumpTeam: TeamId | null;
}

// --- Client -> Server Messages ---

export type ClientMessage =
    | { type: 'CREATE_ROOM'; playerName: string; team: TeamId }
    | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; team: TeamId }
    | { type: 'TOGGLE_SWITCH_REQUEST' }
    | { type: 'READY' }
    | { type: 'PASS_VAKKAI' }
    | { type: 'DECLARE_VAKKAI' }
    | { type: 'CHOOSE_HUKUM'; suit: Suit }
    | { type: 'PLAY_CARD'; cardId: string }
    | { type: 'SELECT_DEALER'; dealerId: PlayerId }
    | { type: 'SEND_MESSAGE'; text: string };

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
    | { type: 'TOSS_RESULT'; cards: Record<PlayerId, Card>; dealerTeam: TeamId; trumpTeam: TeamId };

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
    }>;
    dealerTeam: TeamId | null;
    trumpTeam: TeamId | null;
}
