// ============================================
// HUKUM GAME - GAME TABLE COMPONENT
// ============================================

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { PublicGameState, Card as CardType, PlayerId, TeamId } from '../types';
import { SUIT_SYMBOLS } from '../types';
import { Card } from './Card';
import { PlayerHand } from './PlayerHand';
import { ActionButtons } from './ActionButtons';
import './GameTable.css';

interface GameTableProps {
    gameState: PublicGameState;
    myCards: CardType[];
    playerId: string;
    roomCode: string;
    onPassVakkai: () => void;
    onDeclareVakkai: () => void;
    onChooseHukum: (suit: any) => void;
    onPlayCard: (cardId: string) => void;
    onSelectDealer: (dealerId: PlayerId) => void;
    onReady: () => void;
    onToggleSwitchRequest: () => void;
}

export function GameTable({
    gameState,
    myCards,
    playerId,
    roomCode,
    onPassVakkai,
    onDeclareVakkai,
    onChooseHukum,
    onPlayCard,
    onReady,
    onToggleSwitchRequest,
}: GameTableProps) {
    const tableRef = useRef<HTMLDivElement>(null);

    const myPlayer = gameState.players.find(p => p.id === playerId);
    const isMyTurn = gameState.currentTurnId === playerId;
    const isTrumpChooser = gameState.trumpChooserId === playerId;
    const amIReady = myPlayer?.isReady ?? false;

    // Team rosters
    const teamAlpha = gameState.players.filter(p => p.team === 'A');
    const teamBravo = gameState.players.filter(p => p.team === 'B');

    // Copy room ID to clipboard
    const copyRoomId = () => {
        navigator.clipboard.writeText(roomCode);
    };

    // Seat positions relative to current player
    const getSeatPosition = (seat: number) => {
        if (!myPlayer) return 'bottom';
        const relativeSeat = (seat - myPlayer.seat + 4) % 4;
        const positions = ['bottom', 'right', 'top', 'left'];
        return positions[relativeSeat];
    };

    // Entry animation
    useEffect(() => {
        if (tableRef.current) {
            gsap.fromTo(tableRef.current,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
            );
        }
    }, []);

    return (
        <div className="game-table-container">
            <div className="game-table" ref={tableRef}>
                {/* Room code and info bar */}
                <div className="info-bar">
                    <div className="room-info">
                        Room: <strong>{gameState.dealerId ? 'Active' : 'Waiting'}</strong>
                    </div>
                    {gameState.trumpSuit && (
                        <div className="trump-info">
                            Trump: <span className={`trump-suit ${gameState.trumpSuit.toLowerCase()}`}>
                                {SUIT_SYMBOLS[gameState.trumpSuit]}
                            </span>
                        </div>
                    )}
                    <div className="score-bar">
                        <span className="team-a">A: {gameState.score.A}</span>
                        <span className="separator">|</span>
                        <span className="team-b">B: {gameState.score.B}</span>
                    </div>
                </div>

                {/* Trick area */}
                <div className="trick-area">
                    {gameState.currentTrick.cards.map((tc, index) => {
                        const player = gameState.players.find(p => p.id === tc.playerId);
                        const position = player ? getSeatPosition(player.seat) : 'center';
                        return (
                            <div key={index} className={`trick-card ${position}`}>
                                <Card card={tc.card} isInTrick />
                            </div>
                        );
                    })}
                </div>

                {/* Other players */}
                {gameState.players
                    .filter(p => p.id !== playerId)
                    .map(player => {
                        const position = getSeatPosition(player.seat);
                        return (
                            <div key={player.id} className={`opponent ${position}`}>
                                <div className="opponent-info">
                                    <span className={`team-badge team-${player.team.toLowerCase()}`}>
                                        {player.team}
                                    </span>
                                    <span className="opponent-name">{player.name}</span>
                                    {gameState.currentTurnId === player.id && (
                                        <span className="turn-dot" />
                                    )}
                                </div>
                                <div className="opponent-cards">
                                    {Array.from({ length: player.cardCount }).map((_, i) => (
                                        <div key={i} className="card-back-mini" />
                                    ))}
                                </div>
                                <div className="trick-count">{gameState.trickCounts[player.team]} tricks</div>
                            </div>
                        );
                    })}

                {/* Team selection and Ready - New Design */}
                {gameState.phase === 'READY_CHECK' && (
                    <div className="lobby-container">
                        <div className="team-columns">
                            {/* Team Alpha (Blue) */}
                            <div className="team-column team-alpha">
                                <div className="team-header">Team Alpha</div>
                                <div className="player-list">
                                    {teamAlpha.map((player, idx) => (
                                        <div key={player.id} className="player-row">
                                            <span className="player-number">{idx + 1}.</span>
                                            <span className="player-name">{player.name}</span>
                                            {player.wantsSwitch && <span className="switch-indicator">🔄</span>}
                                            <span className={`player-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                                                {player.isReady ? 'READY' : 'NOT READY'}
                                            </span>
                                        </div>
                                    ))}
                                    {teamAlpha.length < 2 && (
                                        <div className="player-row empty">
                                            <span className="player-number">{teamAlpha.length + 1}.</span>
                                            <span className="player-name">Waiting...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Bravo (Red) */}
                            <div className="team-column team-bravo">
                                <div className="team-header">Team Bravo</div>
                                <div className="player-list">
                                    {teamBravo.map((player, idx) => (
                                        <div key={player.id} className="player-row">
                                            <span className="player-number">{idx + 1}.</span>
                                            <span className="player-name">{player.name}</span>
                                            {player.wantsSwitch && <span className="switch-indicator">🔄</span>}
                                            <span className={`player-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                                                {player.isReady ? 'READY' : 'NOT READY'}
                                            </span>
                                        </div>
                                    ))}
                                    {teamBravo.length < 2 && (
                                        <div className="player-row empty">
                                            <span className="player-number">{teamBravo.length + 1}.</span>
                                            <span className="player-name">Waiting...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lobby-actions">
                            {gameState.players.length === 4 && (
                                <button
                                    className={`action-btn switch-teams-btn ${myPlayer?.wantsSwitch ? 'active' : ''}`}
                                    onClick={onToggleSwitchRequest}
                                >
                                    {myPlayer?.wantsSwitch ? '✓ Switch Requested' : 'Request Team Switch'}
                                </button>
                            )}
                            <button
                                className="action-btn copy-room-btn"
                                onClick={copyRoomId}
                            >
                                Copy Room ID
                            </button>
                        </div>

                        {gameState.players.length < 4 && (
                            <div className="team-instruction">
                                👥 Waiting for {4 - gameState.players.length} more player(s)...
                            </div>
                        )}

                        {gameState.players.length === 4 && teamAlpha.length !== 2 && (
                            <div className="team-instruction warning">
                                ⚠️ Teams must be balanced (2v2) to start the game
                            </div>
                        )}

                        <div className="party-id">
                            Party ID: <strong>{roomCode}</strong>
                        </div>

                        {!amIReady ? (
                            <button 
                                className="ready-btn" 
                                onClick={onReady}
                                disabled={teamAlpha.length !== 2 || teamBravo.length !== 2}
                            >
                                Ready to Play
                            </button>
                        ) : (
                            <div className="ready-status">✓ You are ready! Waiting for others...</div>
                        )}
                    </div>
                )}

                {/* Match End */}
                {gameState.phase === 'MATCH_END' && (
                    <div className="match-end-overlay">
                        <div className="match-result">
                            <h2>MATCH OVER</h2>
                            <div className="final-score">
                                <div className="team-score team-a">
                                    <div className="team-label">Team Alpha</div>
                                    <div className="score-value">{gameState.score.A}</div>
                                </div>
                                <div className="vs">VS</div>
                                <div className="team-score team-b">
                                    <div className="team-label">Team Bravo</div>
                                    <div className="score-value">{gameState.score.B}</div>
                                </div>
                            </div>
                            <div className="winner-announcement">
                                {gameState.score.A > gameState.score.B ? 'Team Alpha Wins! 🏆' :
                                    gameState.score.B > gameState.score.A ? 'Team Bravo Wins! 🏆' : 'It\'s a Tie!'}
                            </div>
                            <p className="restart-message">Starting new game in 10 seconds...</p>
                        </div>
                    </div>
                )}

                {/* Hand End */}
                {gameState.phase === 'HAND_END' && (
                    <div className="hand-end-overlay">
                        <div className="hand-result">
                            <h3>HAND COMPLETE</h3>
                            <div className="hand-winner">
                                {gameState.dealerTeam === 'A' ? 'Team Alpha' : 'Team Bravo'} wins this hand!
                            </div>
                            <div className="current-score">
                                <div className="score-row">
                                    <span className="team-name team-a">Team Alpha:</span>
                                    <span className="score-points">{gameState.score.A}</span>
                                </div>
                                <div className="score-row">
                                    <span className="team-name team-b">Team Bravo:</span>
                                    <span className="score-points">{gameState.score.B}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Waiting for players */}
                {gameState.phase === 'WAITING_FOR_PLAYERS' && (
                    <div className="waiting-message">
                        Waiting for players... ({gameState.players.length}/4)
                    </div>
                )}

                {/* Phase-specific message */}
                {gameState.phase === 'VAKKAI_PLAY' && gameState.vakkai.active && (
                    <div className="vakkai-banner">
                        ⚡ VAKKAI MODE ⚡
                        <span className="vakkai-wins">
                            {gameState.vakkai.consecutiveWins}/4 consecutive wins
                        </span>
                    </div>
                )}
            </div>

            {/* My hand */}
            {myCards.length > 0 && (
                <PlayerHand
                    cards={myCards}
                    isMyTurn={isMyTurn && (gameState.phase === 'TRICK_PLAY' || gameState.phase === 'VAKKAI_PLAY')}
                    onPlayCard={onPlayCard}
                />
            )}

            {/* Action buttons */}
            <ActionButtons
                phase={gameState.phase}
                isMyTurn={isMyTurn}
                isTrumpChooser={isTrumpChooser}
                onPassVakkai={onPassVakkai}
                onDeclareVakkai={onDeclareVakkai}
                onChooseHukum={onChooseHukum}
            />
        </div>
    );
}
