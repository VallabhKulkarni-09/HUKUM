// ============================================
// HUKUM GAME - CLIENT TYPES
// ============================================

export type Suit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';

export interface Card {
    suit: Suit;
    rank: Rank;
    id: string;
}

export type PlayerId = string;
export type SeatPosition = 0 | 1 | 2 | 3;
export type TeamId = 'A' | 'B';

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

export interface VakkaiState {
    active: boolean;
    declarerId: PlayerId | null;
    consecutiveWins: number;
}

export interface TrickCard {
    playerId: PlayerId;
    card: Card;
}

export interface TrickState {
    cards: TrickCard[];
    leadSuit: Suit | null;
    winnerId: PlayerId | null;
}

export interface Score {
    A: number;
    B: number;
}

export interface PublicPlayer {
    id: PlayerId;
    name: string;
    seat: SeatPosition;
    team: TeamId;
    cardCount: number;
    isReady: boolean;
    isConnected: boolean;
    wantsSwitch: boolean;
}

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
    players: PublicPlayer[];
    dealerTeam: TeamId | null;
    trumpTeam: TeamId | null;
}

// Server messages
export type ServerMessage =
    | { type: 'ROOM_CREATED'; roomCode: string; playerId: PlayerId; seat: SeatPosition }
    | { type: 'ROOM_JOINED'; roomCode: string; playerId: PlayerId; seat: SeatPosition }
    | { type: 'PLAYER_JOINED'; player: PublicPlayer }
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

// Suit symbols for display
export const SUIT_SYMBOLS: Record<Suit, string> = {
    'SPADE': '♠',
    'HEART': '♥',
    'DIAMOND': '♦',
    'CLUB': '♣',
};

export const SUIT_COLORS: Record<Suit, string> = {
    'SPADE': '#1a1a2e',
    'HEART': '#e63946',
    'DIAMOND': '#e63946',
    'CLUB': '#1a1a2e',
};
