// ============================================
// HUKUM GAME - CHAT BOX COMPONENT
// ============================================

import { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

interface ChatMessage {
    playerId: string;
    playerName: string;
    text: string;
    timestamp: Date;
}

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    myPlayerId: string | null;
}

export function ChatBox({ messages, onSendMessage, myPlayerId }: ChatBoxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText.trim());
            setInputText('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <button
                className={`chat-toggle ${messages.length > 0 ? 'has-messages' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                💬 {messages.length > 0 && <span className="badge">{messages.length}</span>}
            </button>

            {isOpen && (
                <div className="chat-box">
                    <div className="chat-header">
                        <span>Team Chat</span>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="no-messages">No messages yet</div>
                        ) : (
                            messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message ${msg.playerId === myPlayerId ? 'mine' : ''}`}
                                >
                                    <span className="sender">{msg.playerName}</span>
                                    <span className="text">{msg.text}</span>
                                    <span className="time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={handleKeyPress}
                            maxLength={200}
                        />
                        <button onClick={handleSend} disabled={!inputText.trim()}>
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
