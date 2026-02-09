// ============================================
// HUKUM GAME - DEBUG PANEL COMPONENT
// ============================================

import { useState } from 'react';
import type { PublicGameState, Card } from '../types';
import { SUIT_SYMBOLS } from '../types';
import './DebugPanel.css';

interface DebugPanelProps {
    gameState: PublicGameState | null;
    myCards: Card[];
    playerId: string | null;
    roomCode: string | null;
}

export function DebugPanel({ gameState, myCards, playerId, roomCode }: DebugPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!gameState) return null;

    const formatCard = (card: Card) => `${card.rank}${SUIT_SYMBOLS[card.suit]}`;

    return (
        <>
            <button
                className="debug-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '✕' : '🔧'}
            </button>

            {isOpen && (
                <div className="debug-panel">
                    <h3>Debug Panel</h3>

                    <div className="debug-section">
                        <h4>Room</h4>
                        <p>Code: <strong>{roomCode}</strong></p>
                        <p>My ID: <code>{playerId?.slice(0, 8)}...</code></p>
                    </div>

                    <div className="debug-section">
                        <h4>Game State</h4>
                        <p>Phase: <span className="phase-badge">{gameState.phase}</span></p>
                        <p>Trump: {gameState.trumpSuit ? SUIT_SYMBOLS[gameState.trumpSuit] : 'None'}</p>
                        <p>Current Turn: {gameState.currentTurnId?.slice(0, 8) || 'N/A'}</p>
                    </div>

                    <div className="debug-section">
                        <h4>Score</h4>
                        <div className="score-display">
                            <span className="team-a">Team A: {gameState.score.A}</span>
                            <span className="team-b">Team B: {gameState.score.B}</span>
                        </div>
                    </div>

                    <div className="debug-section">
                        <h4>Trick Counts</h4>
                        <p>Team A: {gameState.trickCounts.A} | Team B: {gameState.trickCounts.B}</p>
                    </div>

                    <div className="debug-section">
                        <h4>Vakkai</h4>
                        <p>Active: {gameState.vakkai.active ? 'Yes' : 'No'}</p>
                        {gameState.vakkai.active && (
                            <>
                                <p>Declarer: {gameState.vakkai.declarerId?.slice(0, 8)}</p>
                                <p>Consecutive Wins: {gameState.vakkai.consecutiveWins}</p>
                            </>
                        )}
                    </div>

                    <div className="debug-section">
                        <h4>Players</h4>
                        {gameState.players.map(p => (
                            <div key={p.id} className={`player-row ${p.id === playerId ? 'me' : ''}`}>
                                <span className={`team-indicator team-${p.team.toLowerCase()}`}>{p.team}</span>
                                <span className="player-name">{p.name}</span>
                                <span className="seat">P{p.seat + 1}</span>
                                <span className="cards">{p.cardCount} cards</span>
                                {p.isReady && <span className="ready">✓</span>}
                            </div>
                        ))}
                    </div>

                    <div className="debug-section">
                        <h4>My Hand ({myCards.length})</h4>
                        <div className="hand-display">
                            {myCards.map(c => (
                                <span key={c.id} className={`card-mini ${c.suit === 'HEART' || c.suit === 'DIAMOND' ? 'red' : 'black'}`}>
                                    {formatCard(c)}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="debug-section">
                        <h4>Current Trick</h4>
                        {gameState.currentTrick.cards.length > 0 ? (
                            <div className="trick-display">
                                {gameState.currentTrick.cards.map((tc, i) => (
                                    <span key={i} className={`card-mini ${tc.card.suit === 'HEART' || tc.card.suit === 'DIAMOND' ? 'red' : 'black'}`}>
                                        {formatCard(tc.card)}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p>No cards played</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
