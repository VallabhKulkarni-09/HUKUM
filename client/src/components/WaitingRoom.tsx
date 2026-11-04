// ============================================
// HUKUM - WAITING ROOM
// Blurred table, Team Alpha seats left, Team Bravo seats right,
// room code in the middle, big Ready button at the bottom.
// ============================================

import { useState } from 'react';
import type { PublicGameState, PublicPlayer, PlayerId, TeamId } from '../types';
import { TableScene } from './scene/Scene';
import { AvatarFrame } from './player/AvatarFrame';
import { ChatIcon, CheckIcon, CloseIcon, CopyIcon, HelpIcon, PlusIcon, ShareIcon, SwapIcon, GearIcon } from './ui/Icons';
import './WaitingRoom.css';

interface WaitingRoomProps {
    gameState: PublicGameState;
    playerId: PlayerId;
    roomCode: string;
    unreadCount: number;
    onReady: () => void;
    onToggleSwitchRequest: () => void;
    onAddBot: (team: TeamId) => void;
    onRemoveBot: (botId: PlayerId) => void;
    onOpenChat: () => void;
    onOpenRules: () => void;
    onOpenSettings: () => void;
}

const TEAM_NAME: Record<TeamId, string> = { A: 'Team Alpha', B: 'Team Bravo' };

const TIPS = [
    'Tip: Only a 3 + 1 suit hand can call Vakkai.',
    'Tip: The trump team needs 5 tricks, the dealer team needs 4.',
    'Tip: You must follow the led suit if you can.',
    'Tip: First team to +16 wins the match.',
];

export function WaitingRoom({
    gameState,
    playerId,
    roomCode,
    unreadCount,
    onReady,
    onToggleSwitchRequest,
    onAddBot,
    onRemoveBot,
    onOpenChat,
    onOpenRules,
    onOpenSettings,
}: WaitingRoomProps) {
    const [copied, setCopied] = useState(false);
    // Stable per room so it doesn't change on every re-render
    const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

    const me = gameState.players.find(p => p.id === playerId);
    const count = gameState.players.length;
    const isFull = count === 4;
    const readyCount = gameState.players.filter(p => p.isReady).length;
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard unavailable (insecure origin); the code stays visible and selectable
        }
    };

    const share = async () => {
        try {
            await navigator.share({ title: 'Hukum', text: `Join my Hukum game! Room code: ${roomCode}` });
        } catch {
            // Share sheet dismissed
        }
    };

    const title = !isFull
        ? 'Waiting for players…'
        : me?.isReady
            ? 'Waiting for everyone…'
            : 'Everyone is here!';

    return (
        <main className="wr">
            <TableScene blurred />

            <header className="wr-top">
                <div className="wr-count display" aria-label={`${count} of 4 players`}>
                    <span>{count}</span>/4
                </div>
                <div className="wr-actions">
                    <button type="button" className="icon-btn" onClick={onOpenRules} aria-label="How to play"><HelpIcon /></button>
                    <button type="button" className="icon-btn" onClick={onOpenChat} aria-label="Chat">
                        <ChatIcon />
                        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                    </button>
                    <button type="button" className="icon-btn yellow" onClick={onOpenSettings} aria-label="Settings"><GearIcon /></button>
                </div>
            </header>

            <h1 className="wr-title display display-lg" aria-live="polite">{title}</h1>

            <TeamColumn team="A" gameState={gameState} playerId={playerId} onAddBot={onAddBot} onRemoveBot={onRemoveBot} />

            <section className="wr-room" aria-label="Room code">
                <span className="wr-room-label">Room Code</span>
                <span className="wr-code" aria-label={roomCode.split('').join(' ')}>{roomCode}</span>
                <div className="wr-room-actions">
                    <button type="button" className="btn btn-blue btn-sm" onClick={copy}>
                        {copied ? <><CheckIcon /><span>Copied!</span></> : <><CopyIcon /><span>Copy</span></>}
                    </button>
                    {canShare && (
                        <button type="button" className="btn btn-yellow btn-sm" onClick={share}>
                            <ShareIcon /><span>Share</span>
                        </button>
                    )}
                </div>
            </section>

            <TeamColumn team="B" gameState={gameState} playerId={playerId} onAddBot={onAddBot} onRemoveBot={onRemoveBot} />

            <footer className="wr-bottom">
                {isFull && (
                    <button
                        type="button"
                        className={`btn btn-sm ${me?.wantsSwitch ? 'btn-orange' : 'btn-blue'} wr-switch`}
                        onClick={onToggleSwitchRequest}
                        aria-pressed={me?.wantsSwitch}
                        title="You swap seats when someone on the other team also asks"
                    >
                        <SwapIcon /><span>{me?.wantsSwitch ? 'Switch asked' : 'Switch team'}</span>
                    </button>
                )}

                {me?.isReady ? (
                    <div className="wr-ready-done display" role="status">
                        <CheckIcon /> Ready! {readyCount}/4
                    </div>
                ) : (
                    <button type="button" className="btn btn-yellow btn-lg wr-ready" onClick={onReady} disabled={!isFull}>
                        <span>{isFull ? 'Ready' : 'Fill 4 seats'}</span>
                    </button>
                )}

                <p className="wr-tip">{isFull ? tip : 'Share the code with friends, or tap + to add a bot.'}</p>
            </footer>
        </main>
    );
}

// ============================================
// TEAM COLUMN
// ============================================

function TeamColumn({ team, gameState, playerId, onAddBot, onRemoveBot }: {
    team: TeamId;
    gameState: PublicGameState;
    playerId: PlayerId;
    onAddBot: (team: TeamId) => void;
    onRemoveBot: (id: PlayerId) => void;
}) {
    const players = gameState.players.filter(p => p.team === team).sort((a, b) => a.seat - b.seat);
    const empty = 2 - players.length;

    return (
        <section className={`wr-team team-${team.toLowerCase()}`} aria-label={TEAM_NAME[team]}>
            <h2 className="wr-team-name">{TEAM_NAME[team]}</h2>
            <div className="wr-seats">
                {players.map(p => (
                    <SeatTile key={p.id} player={p} isMe={p.id === playerId} onRemoveBot={onRemoveBot} />
                ))}
                {Array.from({ length: empty }).map((_, i) => (
                    <button key={`empty-${i}`} type="button" className="wr-seat empty" onClick={() => onAddBot(team)} aria-label={`Add a bot to ${TEAM_NAME[team]}`}>
                        <span className="wr-empty-tile">
                            <EmptySeatArt />
                            <span className="wr-add-badge"><PlusIcon /></span>
                        </span>
                        <span className="nameplate">Add Bot</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

function SeatTile({ player, isMe, onRemoveBot }: { player: PublicPlayer; isMe: boolean; onRemoveBot: (id: PlayerId) => void }) {
    return (
        <div className={`wr-seat ${isMe ? 'me' : ''}`}>
            <AvatarFrame name={player.name} isBot={player.isBot} team={player.team} size="lg" className="wr-avatar">
                {player.isReady && <span className="av-badge check" aria-label="Ready"><CheckIcon /></span>}
                {player.isBot && <span className="av-badge bot">BOT</span>}
            </AvatarFrame>
            {player.isBot && (
                <button type="button" className="wr-remove" onClick={() => onRemoveBot(player.id)} aria-label={`Remove ${player.name}`}>
                    <CloseIcon />
                </button>
            )}
            <span className="nameplate">
                {isMe ? 'You' : player.name}
                {player.wantsSwitch && <span className="tag">Swap</span>}
            </span>
            <span className={`wr-state ${player.isReady ? 'ready' : ''}`}>{player.isReady ? 'Ready' : 'Not ready'}</span>
        </div>
    );
}

/** Silhouette of an empty chair, like an open seat at the table */
function EmptySeatArt() {
    return (
        <svg viewBox="0 0 100 100" className="wr-empty-art" aria-hidden>
            <path d="M28 18c0-6 4-10 10-10h24c6 0 10 4 10 10v34H28z" fill="rgba(255,255,255,.28)" />
            <path d="M18 58c0-5 4-8 9-8h46c5 0 9 3 9 8v8H18z" fill="rgba(255,255,255,.28)" />
            <path d="M28 66v22M72 66v22" stroke="rgba(255,255,255,.28)" strokeWidth="8" strokeLinecap="round" />
        </svg>
    );
}
