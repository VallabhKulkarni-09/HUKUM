// ============================================
// HUKUM GAME - WEBSOCKET HOOK
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServerMessage, Card, PublicGameState, Suit, PlayerId, TeamId } from '../types';
import { playSound, initSounds } from '../audio/soundManager';

const WS_URL = 'ws://localhost:3001';

interface ChatMessage {
    playerId: string;
    playerName: string;
    text: string;
    timestamp: Date;
}

interface UseWebSocketReturn {
    // Connection state
    isConnected: boolean;
    error: string | null;

    // Room state
    roomCode: string | null;
    playerId: string | null;
    seat: number | null;

    // Game state
    gameState: PublicGameState | null;
    myCards: Card[];
    chatMessages: ChatMessage[];

    // Actions
    createRoom: (playerName: string, team: TeamId) => void;
    joinRoom: (roomCode: string, playerName: string, team: TeamId) => void;
    toggleSwitchRequest: () => void;
    setReady: () => void;
    passVakkai: () => void;
    declareVakkai: () => void;
    chooseHukum: (suit: Suit) => void;
    playCard: (cardId: string) => void;
    selectDealer: (dealerId: PlayerId) => void;
    sendMessage: (text: string) => void;
    newGame: () => void;
    goHome: () => void;
}

// Global WebSocket connection (persists across StrictMode remounts)
let globalWs: WebSocket | null = null;
let connectionPromise: Promise<void> | null = null;

export function useWebSocket(): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [seat, setSeat] = useState<number | null>(null);
    const [gameState, setGameState] = useState<PublicGameState | null>(null);
    const [myCards, setMyCards] = useState<Card[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const messageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);

    // Handle incoming messages
    const handleMessage = useCallback((message: ServerMessage) => {
        console.log('📨 Received:', message.type);

        switch (message.type) {
            case 'ROOM_CREATED':
                console.log('Room created:', message.roomCode);
                setRoomCode(message.roomCode);
                setPlayerId(message.playerId);
                setSeat(message.seat);
                break;

            case 'ROOM_JOINED':
                setRoomCode(message.roomCode);
                setPlayerId(message.playerId);
                setSeat(message.seat);
                playSound('playerJoin');
                break;

            case 'GAME_STATE':
                setGameState(message.state);
                break;

            case 'PRIVATE_CARDS':
                setMyCards(message.cards);
                playSound('cardDeal');
                break;

            case 'CHAT_MESSAGE':
                setChatMessages(prev => [...prev, {
                    playerId: message.playerId,
                    playerName: message.playerName,
                    text: message.text,
                    timestamp: new Date(),
                }]);
                playSound('notification');
                break;

            case 'ERROR':
                setError(message.message);
                setTimeout(() => setError(null), 3000);
                break;

            case 'GO_HOME':
                // Reset all room state to return to lobby
                setRoomCode(null);
                setPlayerId(null);
                setSeat(null);
                setGameState(null);
                setMyCards([]);
                setChatMessages([]);
                break;

            default:
                // Other messages - just log them
                break;
        }
    }, []);

    // Store latest handler in ref
    messageHandlerRef.current = handleMessage;

    // Connect to WebSocket (only once globally)
    useEffect(() => {
        const connect = () => {
            if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
                // Already connected or connecting
                if (globalWs.readyState === WebSocket.OPEN) {
                    setIsConnected(true);
                }
                return;
            }

            console.log('🔌 Creating new WebSocket connection...');
            const ws = new WebSocket(WS_URL);
            globalWs = ws;

            connectionPromise = new Promise<void>((resolve) => {
                ws.onopen = () => {
                    console.log('🔗 Connected to Hukum server');
                    setIsConnected(true);
                    setError(null);
                    initSounds();
                    resolve();
                };
            });

            ws.onclose = () => {
                console.log('❌ Disconnected from server');
                setIsConnected(false);
                globalWs = null;
                connectionPromise = null;
            };

            ws.onerror = () => {
                setError('Connection error');
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as ServerMessage;
                    if (messageHandlerRef.current) {
                        messageHandlerRef.current(message);
                    }
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
        };

        connect();

        // Don't close on unmount - keep connection alive
        return () => {
            // Only log, don't actually close
            console.log('🔄 Component unmounting (connection kept alive)');
        };
    }, []);

    // Send helper
    const send = useCallback((data: object) => {
        console.log('📤 Sending:', data);
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not ready, state:', globalWs?.readyState);
            setError('Not connected to server');
        }
    }, []);

    // Actions
    const createRoom = useCallback((playerName: string, team: TeamId) => {
        console.log('Creating room for:', playerName, 'Team:', team);
        send({ type: 'CREATE_ROOM', playerName, team });
    }, [send]);

    const joinRoom = useCallback((roomCode: string, playerName: string, team: TeamId) => {
        send({ type: 'JOIN_ROOM', roomCode, playerName, team });
    }, [send]);

    const toggleSwitchRequest = useCallback(() => {
        send({ type: 'TOGGLE_SWITCH_REQUEST' });
    }, [send]);

    const setReady = useCallback(() => {
        send({ type: 'READY' });
    }, [send]);

    const passVakkai = useCallback(() => {
        send({ type: 'PASS_VAKKAI' });
    }, [send]);

    const declareVakkai = useCallback(() => {
        send({ type: 'DECLARE_VAKKAI' });
        playSound('vakkaiDeclare');
    }, [send]);

    const chooseHukum = useCallback((suit: Suit) => {
        send({ type: 'CHOOSE_HUKUM', suit });
    }, [send]);

    const playCard = useCallback((cardId: string) => {
        send({ type: 'PLAY_CARD', cardId });
        playSound('cardPlay');
    }, [send]);

    const selectDealer = useCallback((dealerId: PlayerId) => {
        send({ type: 'SELECT_DEALER', dealerId });
    }, [send]);

    const sendMessage = useCallback((text: string) => {
        send({ type: 'SEND_MESSAGE', text });
    }, [send]);

    const newGame = useCallback(() => {
        send({ type: 'NEW_GAME' });
    }, [send]);

    const goHome = useCallback(() => {
        send({ type: 'GO_HOME' });
    }, [send]);

    return {
        isConnected,
        error,
        roomCode,
        playerId,
        seat,
        gameState,
        myCards,
        chatMessages,
        createRoom,
        joinRoom,
        toggleSwitchRequest,
        setReady,
        passVakkai,
        declareVakkai,
        chooseHukum,
        playCard,
        selectDealer,
        sendMessage,
        newGame,
        goHome,
    };
}
