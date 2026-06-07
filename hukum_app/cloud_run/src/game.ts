import { Card, Suit, Rank, TrickCard, TrickState, PlayerId, Score, TeamId, SeatPosition, Player, GamePhase, GameState, RANK_VALUES, SUITS, RANKS } from './types.js';

// === Card ===
function createCard(suit: Suit, rank: Rank): Card { return { suit, rank, id: `${suit}_${rank}` }; }
function getCardValue(card: Card): number { return RANK_VALUES[card.rank]; }
function compareCards(a: Card, b: Card): number { return getCardValue(a) - getCardValue(b); }

// === Deck ===
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(createCard(suit, rank));
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const s = [...deck];
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}

function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number) {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  let idx = 0;
  for (let r = 0; r < cardsPerPlayer; r++) for (let p = 0; p < numPlayers; p++) if (idx < deck.length) hands[p].push(deck[idx++]);
  return { hands, remaining: deck.slice(idx) };
}

// === Trick ===
function createTrickState(): TrickState { return { cards: [], leadSuit: null, winnerId: null }; }

function calculateTrickWinner(trick: TrickState, trumpSuit: Suit | null): PlayerId | null {
  if (trick.cards.length === 0) return null;
  const leadSuit = trick.leadSuit!;
  const trumpCards = trumpSuit ? trick.cards.filter(c => c.card.suit === trumpSuit) : [];
  if (trumpCards.length > 0) return trumpCards.reduce((h, c) => compareCards(c.card, h.card) > 0 ? c : h).playerId;
  const leadCards = trick.cards.filter(c => c.card.suit === leadSuit);
  return leadCards.reduce((h, c) => compareCards(c.card, h.card) > 0 ? c : h).playerId;
}

// === Scoring ===
const SCORING = { VAKKAI_SUCCESS: 8, VAKKAI_FAILURE: 16, TRUMP_TEAM_WIN: 5, DEALER_TEAM_WIN: 10, TRUMP_TEAM_TARGET: 5, DEALER_TEAM_TARGET: 4, VAKKAI_TARGET: 4 };

function applyScore(score: Score, winningTeam: TeamId, points: number): Score {
  const s = { ...score };
  if (winningTeam === 'A') { s.A += points; s.B -= points; } else { s.B += points; s.A -= points; }
  return s;
}
function isMatchEnd(score: Score): boolean { return Math.abs(score.A) >= 16 || Math.abs(score.B) >= 16; }
function getDealerChoosingTeam(score: Score): TeamId { return score.A < 0 ? 'A' : score.B < 0 ? 'B' : 'A'; }
function getOppositeTeam(team: TeamId): TeamId { return team === 'A' ? 'B' : 'A'; }

function checkHandWinner(trickCounts: Record<TeamId, number>, trumpTeam: TeamId, dealerTeam: TeamId) {
  if (trickCounts[trumpTeam] >= SCORING.TRUMP_TEAM_TARGET) return { team: trumpTeam, points: SCORING.TRUMP_TEAM_WIN, reason: 'Trump team won 5 tricks' };
  if (trickCounts[dealerTeam] >= SCORING.DEALER_TEAM_TARGET) return { team: dealerTeam, points: SCORING.DEALER_TEAM_WIN, reason: 'Dealer team won 4 tricks' };
  return null;
}

// === Game Engine ===
export class GameEngine {
  private players = new Map<PlayerId, Player>();
  private state: GameState;
  private deck: Card[] = [];
  private remainingDeck: Card[] = [];

  constructor() { this.state = this.initialState(); }

  private initialState(): GameState {
    return { phase: 'WAITING_FOR_PLAYERS', dealerId: null, trumpChooserId: null, currentTurnId: null,
      vakkaiDecisionIndex: 0, trumpSuit: null, vakkai: { active: false, declarerId: null, consecutiveWins: 0 },
      currentTrick: createTrickState(), trickCounts: { A: 0, B: 0 }, score: { A: 0, B: 0 }, dealerTeam: null, trumpTeam: null };
  }

  addPlayer(id: PlayerId, name: string, team?: TeamId): Player | null {
    if (this.players.size >= 4) return null;
    const counts = { A: 0, B: 0 };
    for (const p of this.players.values()) counts[p.team]++;
    const assignedTeam: TeamId = team ? (counts[team] >= 2 ? (null as any) : team) : (counts.A <= counts.B ? 'A' : 'B');
    if (!assignedTeam) return null;
    const takenSeats = new Set([...this.players.values()].map(p => p.seat));
    const teamSeats: SeatPosition[] = assignedTeam === 'A' ? [0, 2] : [1, 3];
    const seat = teamSeats.find(s => !takenSeats.has(s));
    if (seat === undefined) return null;
    const player: Player = { id, name, seat, team: assignedTeam, hand: [], isReady: false, isConnected: true, wantsSwitch: false };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: PlayerId) { this.players.delete(id); }
  getPlayer(id: PlayerId) { return this.players.get(id); }
  private getPlayerBySeat(seat: SeatPosition) { return [...this.players.values()].find(p => p.seat === seat); }

  setPlayerReady(id: PlayerId, ready: boolean) { const p = this.players.get(id); if (p) p.isReady = ready; return !!p; }

  allPlayersReady(): boolean {
    if (this.players.size !== 4) return false;
    const counts = { A: 0, B: 0 };
    for (const p of this.players.values()) counts[p.team]++;
    if (counts.A !== 2 || counts.B !== 2) return false;
    return [...this.players.values()].every(p => p.isReady);
  }

  startReadyCheck() { if (this.players.size !== 4) return false; this.state.phase = 'READY_CHECK'; return true; }

  performInitialToss() {
    this.state.phase = 'INITIAL_TOSS';
    const tossCards = shuffleDeck(createDeck()).slice(0, 4);
    const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    const tossMap: Record<string, Card> = {};
    let teamA = 0, teamB = 0;
    players.forEach((p, i) => {
      tossMap[p.id] = tossCards[i];
      const pts = RANK_VALUES[tossCards[i].rank];
      if (i % 2 === 0) teamA += pts; else teamB += pts;
    });
    const dealerTeam: TeamId = teamA <= teamB ? 'A' : 'B';
    const trumpTeam: TeamId = getOppositeTeam(dealerTeam);
    this.state.dealerTeam = dealerTeam;
    this.state.trumpTeam = trumpTeam;
    const dealer = players.find(p => p.team === dealerTeam)!;
    this.state.dealerId = dealer.id;
    const trumpChooserSeat = ((dealer.seat + 1) % 4) as SeatPosition;
    this.state.trumpChooserId = this.getPlayerBySeat(trumpChooserSeat)!.id;
    return { dealerTeam, trumpTeam, tossCards: tossMap };
  }

  dealFirstHalf() {
    this.state.phase = 'DEALING_FIRST';
    this.deck = shuffleDeck(createDeck());
    const { hands, remaining } = dealCards(this.deck, 4, 4);
    this.remainingDeck = remaining;
    const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    players.forEach((p, i) => { p.hand = hands[i]; });
    this.sortAllHands();
    this.state.phase = 'VAKKAI_DECISION';
    const dealer = this.players.get(this.state.dealerId!)!;
    const firstSeat = ((dealer.seat + 1) % 4) as SeatPosition;
    this.state.currentTurnId = this.getPlayerBySeat(firstSeat)!.id;
    this.state.vakkaiDecisionIndex = 0;
  }

  passVakkai(playerId: PlayerId): boolean {
    if (this.state.phase !== 'VAKKAI_DECISION' || this.state.currentTurnId !== playerId) return false;
    this.state.vakkaiDecisionIndex++;
    if (this.state.vakkaiDecisionIndex >= 4) {
      this.state.phase = 'HUKUM_SELECTION';
      this.state.currentTurnId = this.state.trumpChooserId;
    } else {
      const cur = this.players.get(playerId)!;
      this.state.currentTurnId = this.getPlayerBySeat(((cur.seat + 1) % 4) as SeatPosition)!.id;
    }
    return true;
  }

  declareVakkai(playerId: PlayerId): boolean {
    if (this.state.phase !== 'VAKKAI_DECISION' || this.state.currentTurnId !== playerId) return false;
    this.state.vakkai = { active: true, declarerId: playerId, consecutiveWins: 0 };
    this.state.phase = 'VAKKAI_PLAY';
    this.state.trumpSuit = null;
    this.state.currentTurnId = playerId;
    this.state.currentTrick = createTrickState();
    return true;
  }

  chooseHukum(playerId: PlayerId, suit: Suit): boolean {
    if (this.state.phase !== 'HUKUM_SELECTION' || this.state.trumpChooserId !== playerId) return false;
    this.state.trumpSuit = suit;
    this.state.phase = 'DEALING_SECOND';
    this.dealSecondHalf();
    this.state.phase = 'TRICK_PLAY';
    const chooser = this.players.get(playerId)!;
    this.state.currentTurnId = this.getPlayerBySeat(((chooser.seat + 1) % 4) as SeatPosition)!.id;
    this.state.currentTrick = createTrickState();
    return true;
  }

  private dealSecondHalf() {
    const { hands } = dealCards(this.remainingDeck, 4, 4);
    const players = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    players.forEach((p, i) => { p.hand = [...p.hand, ...hands[i]]; });
    this.sortAllHands();
    this.remainingDeck = [];
  }

  playCard(playerId: PlayerId, cardId: string): { success: boolean; error?: string; trickComplete?: boolean; winnerId?: string; handEnd?: any } {
    if (this.state.phase !== 'TRICK_PLAY' && this.state.phase !== 'VAKKAI_PLAY') return { success: false, error: 'Not in trick play phase' };
    if (this.state.currentTurnId !== playerId) return { success: false, error: 'Not your turn' };
    const player = this.players.get(playerId)!;
    const card = player.hand.find(c => c.id === cardId);
    if (!card) return { success: false, error: 'Card not in hand' };
    // Follow suit check
    if (this.state.currentTrick.leadSuit) {
      const hasLead = player.hand.some(c => c.suit === this.state.currentTrick.leadSuit);
      if (hasLead && card.suit !== this.state.currentTrick.leadSuit) return { success: false, error: `Must follow suit (${this.state.currentTrick.leadSuit})` };
    }
    player.hand = player.hand.filter(c => c.id !== cardId);
    this.state.currentTrick.cards.push({ playerId, card });
    if (!this.state.currentTrick.leadSuit) this.state.currentTrick.leadSuit = card.suit;

    const isVakkai = this.state.vakkai.active;
    const requiredCards = isVakkai ? 3 : 4;
    if (this.state.currentTrick.cards.length >= requiredCards) {
      return this.resolveTrick();
    }
    this.advanceToNextPlayer();
    return { success: true, trickComplete: false };
  }

  private advanceToNextPlayer() {
    const cur = this.players.get(this.state.currentTurnId!)!;
    if (this.state.vakkai.active) {
      const declarerSeat = this.players.get(this.state.vakkai.declarerId!)!.seat;
      const partnerSeat = (declarerSeat + 2) % 4;
      let next = (cur.seat + 1) % 4;
      if (next === partnerSeat) next = (next + 1) % 4;
      const nextPlayer = this.getPlayerBySeat(next as SeatPosition);
      if (!nextPlayer) return;
      this.state.currentTurnId = nextPlayer.id;
    } else {
      const nextPlayer = this.getPlayerBySeat(((cur.seat + 1) % 4) as SeatPosition);
      if (!nextPlayer) return;
      this.state.currentTurnId = nextPlayer.id;
    }
  }

  private resolveTrick(): { success: boolean; trickComplete: boolean; winnerId: string; handEnd?: any } {
    const winnerId = calculateTrickWinner(this.state.currentTrick, this.state.trumpSuit)!;
    const winner = this.players.get(winnerId)!;
    this.state.trickCounts[winner.team]++;
    this.state.currentTrick.winnerId = winnerId;

    if (this.state.vakkai.active) {
      const declarerId = this.state.vakkai.declarerId!;
      const declarerTeam = this.players.get(declarerId)!.team;
      if (winnerId === declarerId) {
        this.state.vakkai.consecutiveWins++;
        if (this.state.vakkai.consecutiveWins >= SCORING.VAKKAI_TARGET) {
          this.state.score = applyScore(this.state.score, declarerTeam, SCORING.VAKKAI_SUCCESS);
          return this.endHand(declarerTeam, SCORING.VAKKAI_SUCCESS, 'Vakkai success', winnerId);
        }
        // Don't clear trick yet — let sync show it, then clearTrick() before next play
        this.state.currentTurnId = declarerId;
      } else {
        const oppTeam = getOppositeTeam(declarerTeam);
        this.state.score = applyScore(this.state.score, oppTeam, SCORING.VAKKAI_FAILURE);
        return this.endHand(oppTeam, SCORING.VAKKAI_FAILURE, 'Vakkai failure', winnerId);
      }
    } else {
      const handResult = checkHandWinner(this.state.trickCounts, this.state.trumpTeam!, this.state.dealerTeam!);
      if (handResult) {
        this.state.score = applyScore(this.state.score, handResult.team, handResult.points);
        return this.endHand(handResult.team, handResult.points, handResult.reason, winnerId);
      }
      // Don't clear trick yet — keep it visible for the sync
      this.state.currentTurnId = winnerId;
    }
    return { success: true, trickComplete: true, winnerId };
  }

  // Call this before starting next trick play
  clearTrick() {
    this.state.currentTrick = createTrickState();
  }

  private endHand(winnerTeam: TeamId, points: number, reason: string, winnerId: string) {
    if (isMatchEnd(this.state.score)) {
      this.state.phase = 'MATCH_END';
    } else {
      this.state.phase = 'HAND_END';
      this.state.dealerTeam = getDealerChoosingTeam(this.state.score);
      this.state.trumpTeam = getOppositeTeam(this.state.dealerTeam);
    }
    return { success: true, trickComplete: true, winnerId, handEnd: { team: winnerTeam, points, reason } };
  }

  startNextHand(): boolean {
    if (this.state.phase !== 'HAND_END') return false;
    const choosingTeam = getDealerChoosingTeam(this.state.score);
    const dealer = [...this.players.values()].filter(p => p.team === choosingTeam).sort((a, b) => a.seat - b.seat)[0];
    if (!dealer) return false;
    this.state.dealerId = dealer.id;
    this.state.trumpChooserId = this.getPlayerBySeat(((dealer.seat + 1) % 4) as SeatPosition)!.id;
    this.state.vakkai = { active: false, declarerId: null, consecutiveWins: 0 };
    this.state.vakkaiDecisionIndex = 0;
    this.state.trumpSuit = null;
    this.state.currentTrick = createTrickState();
    this.state.trickCounts = { A: 0, B: 0 };
    for (const p of this.players.values()) p.hand = [];
    this.dealFirstHalf();
    return true;
  }

  resetMatch() {
    this.state = this.initialState();
    this.state.phase = 'READY_CHECK';
    for (const p of this.players.values()) { p.hand = []; p.isReady = false; }
  }

  private sortAllHands() {
    const order: Record<string, number> = { 'SPADE': 0, 'HEART': 1, 'DIAMOND': 2, 'CLUB': 3 };
    for (const p of this.players.values()) p.hand.sort((a, b) => (order[a.suit] - order[b.suit]) || (getCardValue(b) - getCardValue(a)));
  }

  getPublicState() {
    return {
      ...this.state,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, seat: p.seat, team: p.team,
        cardCount: p.hand.length, isReady: p.isReady, isConnected: p.isConnected, wantsSwitch: p.wantsSwitch,
      })),
    };
  }

  getPlayerHand(playerId: PlayerId): Card[] { return this.players.get(playerId)?.hand ?? []; }
  getPhase() { return this.state.phase; }
  getPlayerCount() { return this.players.size; }
}
