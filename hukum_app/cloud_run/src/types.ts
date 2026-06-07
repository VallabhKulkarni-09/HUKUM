export type Suit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';
export type PlayerId = string;
export type SeatPosition = 0 | 1 | 2 | 3;
export type TeamId = 'A' | 'B';

export interface Card { suit: Suit; rank: Rank; id: string; }
export interface TrickCard { playerId: PlayerId; card: Card; }
export interface TrickState { cards: TrickCard[]; leadSuit: Suit | null; winnerId: PlayerId | null; }
export interface Score { A: number; B: number; }
export interface VakkaiState { active: boolean; declarerId: PlayerId | null; consecutiveWins: number; }

export interface Player {
  id: PlayerId; name: string; seat: SeatPosition; team: TeamId;
  hand: Card[]; isReady: boolean; isConnected: boolean; wantsSwitch: boolean;
}

export type GamePhase =
  | 'WAITING_FOR_PLAYERS' | 'READY_CHECK' | 'INITIAL_TOSS' | 'DEALING_FIRST'
  | 'VAKKAI_DECISION' | 'HUKUM_SELECTION' | 'DEALING_SECOND'
  | 'TRICK_PLAY' | 'VAKKAI_PLAY' | 'HAND_END' | 'DEALER_SELECTION' | 'MATCH_END';

export interface GameState {
  phase: GamePhase;
  dealerId: PlayerId | null; trumpChooserId: PlayerId | null; currentTurnId: PlayerId | null;
  vakkaiDecisionIndex: number; trumpSuit: Suit | null; vakkai: VakkaiState;
  currentTrick: TrickState; trickCounts: Record<TeamId, number>;
  score: Score; dealerTeam: TeamId | null; trumpTeam: TeamId | null;
}

export const RANK_VALUES: Record<Rank, number> = { 'A': 8, 'K': 7, 'Q': 6, 'J': 5, '10': 4, '9': 3, '8': 2, '7': 1 };
export const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

export function getTeamForSeat(seat: SeatPosition): TeamId { return seat % 2 === 0 ? 'A' : 'B'; }
