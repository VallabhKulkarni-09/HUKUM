// ============================================
// HUKUM - MAIN LOBBY
// Player chip (top-left), logo, two big mode cards, bottom nav.
// ============================================

import { useState } from 'react';
import type { TeamId } from '../types';
import { LobbyBackground, Logo, Loader } from './scene/Scene';
import { AvatarFrame } from './player/AvatarFrame';
import { Modal } from './ui/Modal';
import { BookIcon, DiceIcon, GearIcon } from './ui/Icons';
import { CardBack } from './cards/PlayingCard';
import { NAME_MAX, randomName } from '../prefs';
import './Lobby.css';

interface LobbyProps {
    playerName: string;
    onChangeName: (name: string) => void;
    onCreateRoom: (playerName: string, team: TeamId) => void;
    onJoinRoom: (roomCode: string, playerName: string, team: TeamId) => void;
    onOpenRules: () => void;
    onOpenSettings: () => void;
    isConnected: boolean;
    /** Server error counter; any change ends a pending create/join */
    errorSeq: number;
}

type Dialog = 'none' | 'profile' | 'create' | 'join';

export function Lobby({
    playerName,
    onChangeName,
    onCreateRoom,
    onJoinRoom,
    onOpenRules,
    onOpenSettings,
    isConnected,
    errorSeq,
}: LobbyProps) {
    const [dialog, setDialog] = useState<Dialog>('none');
    const [team, setTeam] = useState<TeamId>('A');
    const [roomCode, setRoomCode] = useState('');
    // Pending until the server answers (screen changes) or reports an error
    const [pendingAt, setPendingAt] = useState<number | null>(null);
    const isPending = pendingAt !== null && pendingAt === errorSeq;

    const close = () => setDialog('none');

    const create = () => {
        setPendingAt(errorSeq);
        onCreateRoom(playerName, team);
    };

    const join = () => {
        if (roomCode.length !== 6) return;
        setPendingAt(errorSeq);
        onJoinRoom(roomCode, playerName, team);
    };

    return (
        <main className="lobby">
            <LobbyBackground />

            <header className="lobby-top">
                <button type="button" className="player-chip" onClick={() => setDialog('profile')} aria-label={`Profile: ${playerName}. Tap to change name`}>
                    <AvatarFrame name={playerName} size="lg" className="player-chip-avatar" />
                    <span className="player-chip-plate">
                        <span className="player-chip-name">{playerName}</span>
                        <span className="player-chip-edit">Tap to edit</span>
                    </span>
                </button>
            </header>

            <section className="lobby-center">
                <Logo />
                <p className="lobby-tagline display">Court Piece · Rang</p>

                <div className="mode-cards">
                    <button type="button" className="mode-card mode-new" onClick={() => setDialog('create')} disabled={!isConnected}>
                        <span className="mode-art" aria-hidden>
                            <span className="mode-fan">
                                <CardBack className="mode-fan-card" />
                                <CardBack className="mode-fan-card" />
                                <CardBack className="mode-fan-card" />
                            </span>
                        </span>
                        <span className="mode-title display">New Game</span>
                        <span className="mode-sub">Friends or bots</span>
                    </button>

                    <button type="button" className="mode-card mode-join" onClick={() => setDialog('join')} disabled={!isConnected}>
                        <span className="mode-art" aria-hidden>
                            <span className="mode-code">
                                {['H', 'U', 'K'].map(c => <span key={c}>{c}</span>)}
                            </span>
                        </span>
                        <span className="mode-title display">Join Game</span>
                        <span className="mode-sub">Enter a room code</span>
                    </button>
                </div>

                {!isConnected && (
                    <div className="lobby-connecting">
                        <Loader label="Connecting" />
                        <span className="display">Connecting to server…</span>
                    </div>
                )}
            </section>

            <nav className="lobby-nav" aria-label="Menu">
                <button type="button" className="nav-btn" onClick={onOpenSettings}>
                    <GearIcon />
                    <span>Settings</span>
                </button>
                <button type="button" className="nav-btn" onClick={onOpenRules}>
                    <BookIcon />
                    <span>How to Play</span>
                </button>
            </nav>

            {dialog === 'profile' && (
                <ProfileModal
                    name={playerName}
                    onSave={(n) => { onChangeName(n); close(); }}
                    onClose={close}
                />
            )}

            {dialog === 'create' && (
                <Modal title="New Game" onClose={close}>
                    <div className="lobby-form">
                        <PlayingAs name={playerName} onEdit={() => setDialog('profile')} />
                        <TeamPicker team={team} onChange={setTeam} />
                        <p className="field-hint center">Empty seats can be filled with bots in the next step.</p>
                        <button type="button" className="btn btn-lg btn-block" onClick={create} disabled={!isConnected || isPending}>
                            {isPending ? <Loader label="Creating room" /> : <span>Create Room</span>}
                        </button>
                    </div>
                </Modal>
            )}

            {dialog === 'join' && (
                <Modal title="Join Game" onClose={close}>
                    <form className="lobby-form" onSubmit={(e) => { e.preventDefault(); join(); }}>
                        <PlayingAs name={playerName} onEdit={() => setDialog('profile')} />
                        <label className="field">
                            <span className="field-label">Room code</span>
                            <input
                                className="input code"
                                type="text"
                                placeholder="ABCDEF"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                maxLength={6}
                                autoCapitalize="characters"
                                autoCorrect="off"
                                autoComplete="off"
                                spellCheck={false}
                                enterKeyHint="go"
                                aria-describedby="code-hint"
                                autoFocus
                            />
                            <span id="code-hint" className={`field-hint ${roomCode.length > 0 && roomCode.length < 6 ? 'error' : ''}`}>
                                {roomCode.length === 0
                                    ? 'Ask the host for the 6-letter code.'
                                    : roomCode.length < 6
                                        ? `${6 - roomCode.length} more ${6 - roomCode.length === 1 ? 'letter' : 'letters'}`
                                        : 'Looks good!'}
                            </span>
                        </label>
                        <TeamPicker team={team} onChange={setTeam} />
                        <button type="submit" className="btn btn-lg btn-block" disabled={!isConnected || roomCode.length !== 6 || isPending}>
                            {isPending ? <Loader label="Joining room" /> : <span>Join Room</span>}
                        </button>
                    </form>
                </Modal>
            )}
        </main>
    );
}

// ============================================
// PIECES
// ============================================

function PlayingAs({ name, onEdit }: { name: string; onEdit: () => void }) {
    return (
        <div className="playing-as">
            <AvatarFrame name={name} size="sm" />
            <span className="playing-as-text">
                <span className="playing-as-label">Playing as</span>
                <span className="playing-as-name">{name}</span>
            </span>
            <button type="button" className="btn btn-blue btn-sm" onClick={onEdit}>
                <span>Change</span>
            </button>
        </div>
    );
}

function TeamPicker({ team, onChange }: { team: TeamId; onChange: (t: TeamId) => void }) {
    return (
        <div className="field">
            <span className="field-label">Choose your team</span>
            <div className="team-picker" role="group" aria-label="Team">
                <button type="button" className="team-tile team-a" aria-pressed={team === 'A'} onClick={() => onChange('A')}>
                    <span className="team-dot" /> Alpha
                </button>
                <button type="button" className="team-tile team-b" aria-pressed={team === 'B'} onClick={() => onChange('B')}>
                    <span className="team-dot" /> Bravo
                </button>
            </div>
        </div>
    );
}

function ProfileModal({ name, onSave, onClose }: { name: string; onSave: (n: string) => void; onClose: () => void }) {
    const [draft, setDraft] = useState(name);
    const trimmed = draft.trim();
    const preview = trimmed || name;

    return (
        <Modal title="Profile" onClose={onClose} wide>
            <form className="profile" onSubmit={(e) => { e.preventDefault(); if (trimmed) onSave(trimmed); }}>
                <div className="profile-preview">
                    <AvatarFrame name={preview} size="xl" />
                    <p className="display profile-tip">Your name picks your avatar!</p>
                </div>
                <div className="profile-form">
                    <label className="field">
                        <span className="field-label">Your name</span>
                        <div className="profile-name-row">
                            <input
                                className="input"
                                type="text"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                maxLength={NAME_MAX}
                                autoComplete="nickname"
                                enterKeyHint="done"
                                aria-invalid={!trimmed}
                                autoFocus
                            />
                            <button type="button" className="btn btn-sm" onClick={() => setDraft(randomName())} aria-label="Random name">
                                <DiceIcon /> <span>Random</span>
                            </button>
                        </div>
                        <span className={`field-hint ${!trimmed ? 'error' : ''}`}>
                            {trimmed ? `${trimmed.length}/${NAME_MAX} characters` : 'Please enter a name.'}
                        </span>
                    </label>
                    <button type="submit" className="btn btn-lg btn-block" disabled={!trimmed}>
                        <span>Confirm</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
