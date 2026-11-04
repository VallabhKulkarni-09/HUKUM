// ============================================
// HUKUM - CHAT POPUP (room chat, visible to everyone at the table)
// ============================================

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../hooks/useWebSocket';
import { Modal } from './ui/Modal';
import { SendIcon, SmileIcon } from './ui/Icons';
import { AvatarFrame } from './player/AvatarFrame';
import './ChatBox.css';

/** One-tap phrases; sent as normal chat text */
const QUICK_PHRASES = ['Nice play! 👏', 'Well done, partner!', 'Hurry up! ⏰', 'Oops! 😅', 'Good game!', 'Let’s go! 🔥'];
const MAX_LEN = 200;

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    myPlayerId: string | null;
    onClose: () => void;
}

export function ChatBox({ messages, onSendMessage, myPlayerId, onClose }: ChatBoxProps) {
    const [text, setText] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    // Keep the newest message in view
    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    const send = (value: string) => {
        const v = value.trim().slice(0, MAX_LEN);
        if (!v) return;
        onSendMessage(v);
        setText('');
    };

    return (
        <Modal title="Chat" onClose={onClose} className="chat-panel">
            <div className="chat-list well" ref={listRef} aria-live="polite">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <SmileIcon width={64} height={64} />
                        <p className="display">Say hi to the table!</p>
                        <span>Everyone in this room can see your messages.</span>
                    </div>
                ) : (
                    messages.map((m, i) => {
                        const mine = m.playerId === myPlayerId;
                        const firstOfRun = messages[i - 1]?.playerId !== m.playerId;
                        return (
                            <div key={i} className={`chat-row ${mine ? 'mine' : ''} ${firstOfRun ? 'first' : ''}`}>
                                {!mine && (
                                    <span className="chat-avatar">
                                        {firstOfRun && <AvatarFrame name={m.playerName} size="sm" />}
                                    </span>
                                )}
                                <div className="chat-bubble-wrap">
                                    {firstOfRun && !mine && <span className="chat-sender">{m.playerName}</span>}
                                    <span className="chat-bubble">{m.text}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="chat-quick" role="group" aria-label="Quick messages">
                {QUICK_PHRASES.map(p => (
                    <button key={p} type="button" className="chat-chip" onClick={() => send(p)}>
                        {p}
                    </button>
                ))}
            </div>

            <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); send(text); }}>
                <input
                    className="input"
                    type="text"
                    placeholder="Type a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={MAX_LEN}
                    enterKeyHint="send"
                    aria-label="Message"
                />
                <button type="submit" className="btn chat-send" disabled={!text.trim()} aria-label="Send">
                    <SendIcon />
                </button>
            </form>
        </Modal>
    );
}
