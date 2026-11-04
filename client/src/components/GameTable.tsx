// ============================================
// HUKUM GAME - GAME TABLE
// Room scene with oval felt; partner on top, opponents left/right,
// you bottom-left, your hand fanned at the bottom, trick in the middle.
// ============================================

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import type { PublicGameState, PublicPlayer, Card, PlayerId, Suit, TeamId } from '../types';
import type { HandResult } from '../hooks/useWebSocket';
import { formatScore, getTrickWinnerId } from '../gameUtils';
import { TableScene, Loader } from './scene/Scene';
import { PlayingCard, CardFan } from './cards/PlayingCard';
import { SuitIcon } from './cards/SuitIcon';
import { SUIT_LABEL } from './cards/suitLabels';
import { PlayerHand } from './PlayerHand';
import { ActionButtons } from './ActionButtons';
import { WaitingRoom } from './WaitingRoom';
import { AvatarFrame } from './player/AvatarFrame';
import { Modal } from './ui/Modal';
import { CloudIcon, GearIcon, SmileIcon, TrophyIcon } from './ui/Icons';
import { playSound } from '../audio/soundManager';
import { DealDirector, selectCount, selectHand, type DealSnapshot } from './deal/DealDirector';
import { DealLayer } from './deal/AnimationController';
import './GameTable.css';

interface GameTableProps {
    gameState: PublicGameState;
    myCards: Card[];
    playerId: string;
    roomCode: string;
    lastHandResult: HandResult | null;
    unreadCount: number;
    onPassVakkai: () => void;
    onDeclareVakkai: () => void;
    onChooseHukum: (suit: Suit) => void;
    onPlayCard: (cardId: string) => void;
    onReady: () => void;
    onToggleSwitchRequest: () => void;
    onAddBot: (team: TeamId) => void;
    onRemoveBot: (botId: PlayerId) => void;
    onNewGame: () => void;
    onGoHome: () => void;
    onOpenChat: () => void;
    onOpenRules: () => void;
    onOpenSettings: () => void;
}

type SeatPos = 'bottom' | 'left' | 'top' | 'right';
// Same seat layout as before the redesign: next seat in turn order appears on the right
const POSITIONS: SeatPos[] = ['bottom', 'right', 'top', 'left'];
const TEAM_NAME: Record<TeamId, string> = { A: 'Alpha', B: 'Bravo' };

export function GameTable(props: GameTableProps) {
    const { gameState, myCards, playerId } = props;

    // Presentation-only deal controller. Lives here (not in Table) so it sees the
    // waiting room → first deal transition, but a mid-hand reconnect starts with no history.
    const [director] = useState(() => new DealDirector());
    const deal = useSyncExternalStore(director.subscribe, director.getSnapshot);
    useLayoutEffect(() => {
        director.observe(gameState, myCards, playerId);
    }, [director, gameState, myCards, playerId]);
    useEffect(() => () => director.dispose(), [director]);

    if (gameState.phase === 'WAITING_FOR_PLAYERS' || gameState.phase === 'READY_CHECK') {
        return (
            <WaitingRoom
                gameState={gameState}
                playerId={props.playerId}
                roomCode={props.roomCode}
                unreadCount={props.unreadCount}
                onReady={props.onReady}
                onToggleSwitchRequest={props.onToggleSwitchRequest}
                onAddBot={props.onAddBot}
                onRemoveBot={props.onRemoveBot}
                onOpenChat={props.onOpenChat}
                onOpenRules={props.onOpenRules}
                onOpenSettings={props.onOpenSettings}
            />
        );
    }

    return <Table {...props} deal={deal} director={director} />;
}

function Table({
    gameState,
    myCards,
    playerId,
    lastHandResult,
    unreadCount,
    onPassVakkai,
    onDeclareVakkai,
    onChooseHukum,
    onPlayCard,
    onNewGame,
    onGoHome,
    onOpenChat,
    onOpenSettings,
    deal,
    director,
}: GameTableProps & { deal: DealSnapshot; director: DealDirector }) {
    const [selected, setSelected] = useState<Card | null>(null);

    const { phase, vakkai, currentTrick, trumpSuit, score, trickCounts } = gameState;
    const me = gameState.players.find(p => p.id === playerId);
    const myTeam: TeamId = me?.team ?? 'A';
    const byId = (id: PlayerId | null) => gameState.players.find(p => p.id === id);

    // While cards are being dealt the table is presentation-only: no input, no trick, no decisions
    const dealing = deal.job !== null;
    const shuffling = dealing && (deal.stage === 'DECK_ENTERING' || deal.stage === 'SHUFFLING' || deal.stage === 'SHUFFLE_COMPLETE') && deal.job!.shuffle;
    const handCards = selectHand(deal, myCards, playerId, me?.cardCount ?? 0, phase);

    const isPlayPhase = phase === 'TRICK_PLAY' || phase === 'VAKKAI_PLAY';
    const isMyTurn = gameState.currentTurnId === playerId;
    const trickFull = currentTrick.cards.length >= (vakkai.active ? 3 : 4);
    const canPlay = isPlayPhase && isMyTurn && !trickFull && !dealing;
    const isOver = phase === 'HAND_END' || phase === 'MATCH_END';

    const declarer = vakkai.active ? byId(vakkai.declarerId) : undefined;
    const sittingOutId = declarer
        ? gameState.players.find(p => p.team === declarer.team && p.id !== declarer.id)?.id
        : undefined;

    const trickWinnerId = trickFull ? getTrickWinnerId(currentTrick, trumpSuit) : null;
    const posOf = (seat: number): SeatPos => POSITIONS[(seat - (me?.seat ?? 0) + 4) % 4];

    // Targets: trump team 5 tricks, dealer team 4 (Vakkai: declarer needs 4 in a row)
    const targetOf = (team: TeamId): number | null => {
        if (vakkai.active || !gameState.trumpTeam || !trumpSuit) return null;
        return team === gameState.trumpTeam ? 5 : 4;
    };

    // ---- Sounds (unchanged from before the redesign) ----
    useEffect(() => {
        if (canPlay) playSound('turnNotify');
    }, [canPlay]);

    useEffect(() => {
        if (phase === 'HAND_END') playSound('trickWin');
        if (phase === 'MATCH_END') playSound(score[myTeam] > 0 ? 'matchWin' : 'matchLose');
        // Only react to phase changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ---- Status text ----
    const status = (() => {
        const current = byId(gameState.currentTurnId);
        const who = current?.id === playerId ? 'You' : current?.name ?? 'Someone';
        if (dealing) return { text: shuffling ? 'Shuffling…' : 'Dealing…', tone: 'info' as const };
        switch (phase) {
            case 'INITIAL_TOSS':
            case 'DEALING_FIRST':
            case 'DEALING_SECOND':
            case 'DEALER_SELECTION':
                return { text: 'Dealing…', tone: 'info' as const };
            case 'VAKKAI_DECISION':
                return isMyTurn ? null : { text: `${who} is thinking about Vakkai…`, tone: 'info' as const };
            case 'HUKUM_SELECTION':
                return gameState.trumpChooserId === playerId
                    ? null
                    : { text: `${byId(gameState.trumpChooserId)?.name ?? 'Someone'} is choosing Hukum…`, tone: 'info' as const };
            case 'TRICK_PLAY':
            case 'VAKKAI_PLAY': {
                if (trickWinnerId) {
                    const w = byId(trickWinnerId);
                    const mine = w?.team === myTeam;
                    return { text: w?.id === playerId ? 'You win the trick!' : `${w?.name} wins the trick!`, tone: mine ? 'good' as const : 'bad' as const };
                }
                if (sittingOutId === playerId) return { text: `You sit out · ${declarer?.name} plays Vakkai`, tone: 'info' as const };
                if (canPlay) {
                    if (selected && myCards.some(c => c.id === selected.id)) {
                        return { text: 'Tap again to play', tone: 'turn' as const };
                    }
                    const lead = currentTrick.leadSuit;
                    if (lead && myCards.some(c => c.suit === lead)) {
                        return { text: `Your turn · follow ${SUIT_LABEL[lead]}`, tone: 'turn' as const, suit: lead };
                    }
                    return { text: 'Your turn!', tone: 'turn' as const };
                }
                return { text: `${who}'s turn`, tone: 'info' as const };
            }
            default:
                return null;
        }
    })();

    const showDecision = !dealing && (
        (phase === 'VAKKAI_DECISION' && isMyTurn) ||
        (phase === 'HUKUM_SELECTION' && gameState.trumpChooserId === playerId));

    const opponents = gameState.players.filter(p => p.id !== playerId);

    return (
        <main className="tbl">
            <TableScene />

            {/* ---- HUD: score (left), actions (right) ---- */}
            <header className="tbl-score" aria-label="Score">
                <div className="scoreboard">
                    {(['A', 'B'] as TeamId[]).map(team => {
                        const target = targetOf(team);
                        return (
                            <div key={team} className={`sb-team team-${team.toLowerCase()} ${team === myTeam ? 'mine' : ''}`}>
                                <span className="sb-name">{TEAM_NAME[team]}{team === myTeam && <span className="sb-you">YOU</span>}</span>
                                <span className="sb-score">{formatScore(score[team])}</span>
                                <span className="sb-tricks" aria-label={`${trickCounts[team]} tricks${target ? ` of ${target}` : ''}`}>
                                    <TrickDots won={trickCounts[team]} target={target} />
                                </span>
                            </div>
                        );
                    })}
                </div>
                <HukumBadge suit={trumpSuit} vakkai={vakkai.active} wins={vakkai.consecutiveWins} />
            </header>

            <div className="tbl-actions">
                <button type="button" className="icon-btn yellow" onClick={onOpenSettings} aria-label="Settings and rules"><GearIcon /></button>
            </div>

            {/* ---- Seats ---- */}
            {opponents.map(p => (
                <Seat
                    key={p.id}
                    player={p}
                    cardCount={selectCount(deal, p.id, p.cardCount)}
                    position={posOf(p.seat)}
                    isPartner={p.team === myTeam}
                    isTurn={!dealing && p.id === gameState.currentTurnId && !trickFull && !isOver && phase !== 'HUKUM_SELECTION'}
                    isChoosing={!dealing && phase === 'HUKUM_SELECTION' && p.id === gameState.trumpChooserId}
                    isDealer={p.id === gameState.dealerId}
                    isDeclarer={vakkai.active && p.id === vakkai.declarerId}
                    isSittingOut={p.id === sittingOutId}
                />
            ))}

            {/* ---- Centre: trick or decision ---- */}
            <section className="tbl-center" aria-label="Table">
                {showDecision ? (
                    <ActionButtons
                        phase={phase}
                        isMyTurn={isMyTurn}
                        isTrumpChooser={gameState.trumpChooserId === playerId}
                        myCards={myCards}
                        onPassVakkai={onPassVakkai}
                        onDeclareVakkai={onDeclareVakkai}
                        onChooseHukum={onChooseHukum}
                    />
                ) : (
                    <div className="trick" aria-label="Current trick" data-deal-center>
                        {!dealing && currentTrick.cards.map(tc => {
                            const p = byId(tc.playerId);
                            return (
                                <div key={tc.playerId} className={`trick-slot ${p ? posOf(p.seat) : 'bottom'}`}>
                                    <PlayingCard card={tc.card} isInTrick isWinner={trickWinnerId === tc.playerId} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {status && (
                    <div className={`status ${status.tone}`} aria-live="polite" key={status.text}>
                        {'suit' in status && status.suit && <SuitIcon suit={status.suit} outlined className="status-suit" />}
                        <span>{status.text}</span>
                    </div>
                )}
            </section>

            {/* ---- Me ---- */}
            {me && (
                <div className="tbl-me">
                    <AvatarFrame
                        name={me.name}
                        team={me.team}
                        size="md"
                        isTurn={!dealing && (isMyTurn && !trickFull && !isOver && (isPlayPhase || phase === 'VAKKAI_DECISION') || (phase === 'HUKUM_SELECTION' && gameState.trumpChooserId === playerId))}
                        isDim={sittingOutId === playerId}
                    >
                        {me.id === gameState.dealerId && <span className="av-badge dealer" title="Dealer">D</span>}
                        {vakkai.active && me.id === vakkai.declarerId && <span className="av-badge vakkai" title="Vakkai">V</span>}
                    </AvatarFrame>
                    <span className="nameplate me-plate">You</span>
                </div>
            )}

            <button type="button" className="tbl-chat" onClick={onOpenChat} aria-label={`Chat${unreadCount ? `, ${unreadCount} unread` : ''}`}>
                <SmileIcon />
                <span>Chat</span>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            {/* ---- Hand ---- */}
            <div className="tbl-hand">
                <PlayerHand
                    cards={handCards}
                    canPlay={canPlay}
                    leadSuit={currentTrick.leadSuit}
                    isSittingOut={sittingOutId === playerId}
                    onPlayCard={onPlayCard}
                    onSelectionChange={setSelected}
                />
            </div>

            {/* ---- Shuffle + deal (presentation only) ---- */}
            {deal.job && <DealLayer key={deal.job.id} director={director} jobId={deal.job.id} myId={playerId} />}

            {/* ---- Results ---- */}
            {phase === 'HAND_END' && (
                <HandResultModal result={lastHandResult} score={score} myTeam={myTeam} />
            )}
            {phase === 'MATCH_END' && (
                <MatchResultModal score={score} myTeam={myTeam} onRematch={onNewGame} onHome={onGoHome} />
            )}
        </main>
    );
}

// ============================================
// SEAT
// ============================================

interface SeatProps {
    player: PublicPlayer;
    /** Face-down cards to draw (lags the server count while a deal animates) */
    cardCount: number;
    position: SeatPos;
    isPartner: boolean;
    isTurn: boolean;
    isChoosing: boolean;
    isDealer: boolean;
    isDeclarer: boolean;
    isSittingOut: boolean;
}

function Seat({ player, cardCount, position, isPartner, isTurn, isChoosing, isDealer, isDeclarer, isSittingOut }: SeatProps) {
    const classes = ['seat', position, isTurn || isChoosing ? 'turn' : '', isSittingOut || !player.isConnected ? 'dim' : ''].filter(Boolean).join(' ');
    return (
        <div className={classes} data-deal-seat={player.id} aria-label={`${player.name}${isPartner ? ', your partner' : ', opponent'}${isTurn ? ', playing now' : ''}`}>
            <div className="seat-id">
                <AvatarFrame name={player.name} isBot={player.isBot} team={player.team} size="md" isTurn={isTurn || isChoosing} isDim={isSittingOut}>
                    {isDealer && <span className="av-badge dealer" title="Dealer">D</span>}
                    {isDeclarer && <span className="av-badge vakkai" title="Vakkai">V</span>}
                    {!player.isConnected && <span className="av-badge offline">OFFLINE</span>}
                    {cardCount > 0 && <span className="av-badge count" aria-hidden>{cardCount}</span>}
                </AvatarFrame>
                <span className={`nameplate seat-plate team-${player.team.toLowerCase()}`}>
                    {player.name}
                </span>
                {isPartner && <span className="seat-role">Partner</span>}
                {isSittingOut && <span className="seat-role">Sitting out</span>}
            </div>
            <CardFan count={cardCount} className="seat-fan" />
        </div>
    );
}

// ============================================
// HUD PIECES
// ============================================

function TrickDots({ won, target }: { won: number; target: number | null }) {
    const total = target ?? Math.max(won, 0);
    if (!target) return <span className="sb-tricks-num">{won} tricks</span>;
    return (
        <>
            {Array.from({ length: total }).map((_, i) => (
                <span key={i} className={`sb-dot ${i < won ? 'on' : ''}`} />
            ))}
        </>
    );
}

function HukumBadge({ suit, vakkai, wins }: { suit: Suit | null; vakkai: boolean; wins: number }) {
    if (vakkai) {
        return (
            <div className="hukum-badge vakkai" aria-label={`Vakkai, ${wins} of 4 tricks in a row`}>
                <span className="hukum-label">VAKKAI</span>
                <span className="hukum-value display">{wins}/4</span>
            </div>
        );
    }
    return (
        <div className="hukum-badge" aria-label={suit ? `Hukum is ${SUIT_LABEL[suit]}` : 'Hukum not chosen yet'}>
            <span className="hukum-label">HUKUM</span>
            <span className="hukum-medal">
                {suit ? <SuitIcon suit={suit} /> : <span className="hukum-q display">?</span>}
            </span>
        </div>
    );
}

// ============================================
// RESULTS
// ============================================

function ScoreTiles({ score, myTeam }: { score: Record<TeamId, number>; myTeam: TeamId }) {
    return (
        <div className="result-scores">
            {(['A', 'B'] as TeamId[]).map(team => (
                <div key={team} className={`result-tile team-${team.toLowerCase()} ${team === myTeam ? 'mine' : ''}`}>
                    <span className="result-team">{TEAM_NAME[team]}{team === myTeam ? ' (you)' : ''}</span>
                    <span className="result-score display">{formatScore(score[team])}</span>
                </div>
            ))}
        </div>
    );
}

function HandResultModal({ result, score, myTeam }: { result: HandResult | null; score: Record<TeamId, number>; myTeam: TeamId }) {
    const won = result ? result.winnerTeam === myTeam : null;
    return (
        <Modal title={won === null ? 'Hand Over' : won ? 'Hand Won!' : 'Hand Lost'} ribbon={won === false ? 'red' : 'green'} className="result">
            <div className="result-body">
                {result && (
                    <>
                        <div className={`result-points display display-lg ${won ? 'pos' : 'neg'}`}>
                            Team {TEAM_NAME[result.winnerTeam]} {formatScore(result.points)}
                        </div>
                        <p className="result-reason">{result.reason}</p>
                    </>
                )}
                <ScoreTiles score={score} myTeam={myTeam} />
                <div className="result-next">
                    <Loader label="Next hand" />
                    <span>Next hand starting…</span>
                </div>
            </div>
        </Modal>
    );
}

function MatchResultModal({ score, myTeam, onRematch, onHome }: { score: Record<TeamId, number>; myTeam: TeamId; onRematch: () => void; onHome: () => void }) {
    const won = score[myTeam] > 0;
    const winner: TeamId = score.A > score.B ? 'A' : 'B';
    return (
        <Modal title={won ? 'Victory!' : 'Defeat'} ribbon={won ? 'yellow' : 'red'} className="result match">
            <div className="result-body">
                <div className={`result-art ${won ? 'win' : 'lose'}`} aria-hidden>
                    {won ? <TrophyIcon width={120} height={120} /> : <CloudIcon width={110} height={110} />}
                </div>
                <p className="result-headline display display-lg">
                    {won ? 'You won the match!' : 'Better luck next time!'}
                </p>
                <p className="result-reason">Team {TEAM_NAME[winner]} reached {formatScore(score[winner])}</p>
                <ScoreTiles score={score} myTeam={myTeam} />
                <div className="result-actions">
                    <button type="button" className="btn btn-yellow btn-block" onClick={onHome}><span>Home</span></button>
                    <button type="button" className="btn btn-block" onClick={onRematch}><span>Rematch</span></button>
                </div>
            </div>
        </Modal>
    );
}
