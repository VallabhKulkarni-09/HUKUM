// ============================================
// HUKUM GAME - LOBBY COMPONENT
// ============================================

import { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomCode: string, playerName: string) => void;
    isConnected: boolean;
    error: string | null;
}

export function Lobby({ onCreateRoom, onJoinRoom, isConnected, error }: LobbyProps) {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

    const handleCreate = () => {
        if (playerName.trim()) {
            onCreateRoom(playerName.trim());
        }
    };

    const handleJoin = () => {
        if (playerName.trim() && roomCode.trim()) {
            onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
        }
    };

    return (
        <div className="lobby">
            <div className="lobby-card">
                <h1 className="lobby-title">
                    <span className="suit spade">♠</span>
                    HUKUM
                    <span className="suit heart">♥</span>
                </h1>
                <p className="lobby-subtitle">Court Piece / Rang</p>

                {!isConnected && (
                    <div className="connection-status connecting">
                        Connecting to server...
                    </div>
                )}

                {error && (
                    <div className="error-message">{error}</div>
                )}

                {isConnected && mode === 'menu' && (
                    <div className="menu-buttons">
                        <button className="btn btn-primary" onClick={() => setMode('create')}>
                            Create Room
                        </button>
                        <button className="btn btn-secondary" onClick={() => setMode('join')}>
                            Join Room
                        </button>
                    </div>
                )}

                {isConnected && mode === 'create' && (
                    <div className="form-container">
                        <input
                            type="text"
                            className="input"
                            placeholder="Your Name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={!playerName.trim()}
                        >
                            Create Game
                        </button>
                        <button className="btn btn-back" onClick={() => setMode('menu')}>
                            ← Back
                        </button>
                    </div>
                )}

                {isConnected && mode === 'join' && (
                    <div className="form-container">
                        <input
                            type="text"
                            className="input"
                            placeholder="Your Name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                        <input
                            type="text"
                            className="input room-code-input"
                            placeholder="Room Code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleJoin}
                            disabled={!playerName.trim() || roomCode.length !== 6}
                        >
                            Join Game
                        </button>
                        <button className="btn btn-back" onClick={() => setMode('menu')}>
                            ← Back
                        </button>
                    </div>
                )}

                <div className="lobby-footer">
                    <span className="suit diamond">♦</span>
                    4 Players • Teams of 2
                    <span className="suit club">♣</span>
                </div>
            </div>
        </div>
    );
}
