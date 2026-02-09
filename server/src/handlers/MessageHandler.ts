// ============================================
// HUKUM GAME - MESSAGE HANDLER
// ============================================

import { WebSocket } from 'ws';
import { ClientMessage, ServerMessage, PlayerId, Suit, TeamId } from '../types.js';
import { RoomManager, getRoomManager } from '../room/RoomManager.js';

// Store player-to-room mapping
const playerRooms = new Map<PlayerId, string>();
const socketToPlayer = new Map<WebSocket, PlayerId>();

/**
 * Handle incoming WebSocket messages
 */
export function handleMessage(socket: WebSocket, data: string): void {
    const roomManager = getRoomManager();

    try {
        const message = JSON.parse(data) as ClientMessage;

        switch (message.type) {
            case 'CREATE_ROOM':
                handleCreateRoom(socket, message.playerName, roomManager);
                break;

            case 'JOIN_ROOM':
                handleJoinRoom(socket, message.roomCode, message.playerName, roomManager);
                break;

            case 'CHANGE_TEAM':
                handleChangeTeam(socket, message.team, roomManager);
                break;

            case 'READY':
                handleReady(socket, roomManager);
                break;

            case 'PASS_VAKKAI':
                handlePassVakkai(socket, roomManager);
                break;

            case 'DECLARE_VAKKAI':
                handleDeclareVakkai(socket, roomManager);
                break;

            case 'CHOOSE_HUKUM':
                handleChooseHukum(socket, message.suit, roomManager);
                break;

            case 'PLAY_CARD':
                handlePlayCard(socket, message.cardId, roomManager);
                break;

            case 'SELECT_DEALER':
                handleSelectDealer(socket, message.dealerId, roomManager);
                break;

            case 'SEND_MESSAGE':
                handleChatMessage(socket, message.text, roomManager);
                break;

            default:
                sendError(socket, 'Unknown message type');
        }
    } catch (e) {
        sendError(socket, 'Invalid message format');
    }
}

/**
 * Handle player disconnect
 */
export function handleDisconnect(socket: WebSocket): void {
    const playerId = socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = playerRooms.get(playerId);
    if (!roomCode) return;

    const roomManager = getRoomManager();
    const room = roomManager.getRoom(roomCode);

    if (room) {
        const player = room.engine.getPlayer(playerId);
        if (player) {
            player.isConnected = false;

            // Notify others
            roomManager.broadcast(roomCode, {
                type: 'PLAYER_LEFT',
                playerId,
            } as ServerMessage);
        }
    }

    socketToPlayer.delete(socket);
}

// ============================================
// MESSAGE HANDLERS
// ============================================

function handleCreateRoom(socket: WebSocket, playerName: string, roomManager: RoomManager): void {
    const result = roomManager.createRoom(playerName, socket);

    if (!result) {
        sendError(socket, 'Failed to create room');
        return;
    }

    const { roomCode, playerId, player } = result;

    playerRooms.set(playerId, roomCode);
    socketToPlayer.set(socket, playerId);

    send(socket, {
        type: 'ROOM_CREATED',
        roomCode,
        playerId,
        seat: player.seat,
    });

    // Send current game state to creator
    const room = roomManager.getRoom(roomCode);
    if (room) {
        send(socket, {
            type: 'GAME_STATE',
            state: room.engine.getPublicState(),
        });
    }
}

function handleJoinRoom(socket: WebSocket, roomCode: string, playerName: string, roomManager: RoomManager): void {
    const result = roomManager.joinRoom(roomCode, playerName, socket);

    if (!result) {
        sendError(socket, 'Failed to join room (room full or not found)');
        return;
    }

    const { playerId, player } = result;

    playerRooms.set(playerId, roomCode);
    socketToPlayer.set(socket, playerId);

    // Send join confirmation to new player
    send(socket, {
        type: 'ROOM_JOINED',
        roomCode,
        playerId,
        seat: player.seat,
    });

    // Notify others
    roomManager.broadcast(roomCode, {
        type: 'PLAYER_JOINED',
        player: {
            id: player.id,
            name: player.name,
            seat: player.seat,
            team: player.team,
            isReady: player.isReady,
            isConnected: player.isConnected,
        },
    }, playerId);

    // Check if room is now full (4 players) - start ready check
    const room = roomManager.getRoom(roomCode);
    if (room && room.engine.getAllPlayers().length === 4) {
        room.engine.startReadyCheck();
    }

    // Send current game state to new player (and broadcast to all)
    if (room) {
        broadcastGameState(roomCode, roomManager);
    }
}

function handleChangeTeam(socket: WebSocket, team: TeamId, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) {
        console.log('❌ Change team failed: room not found');
        return;
    }

    console.log(`👥 Player ${playerId.slice(0, 8)} requesting to join Team ${team}`);

    // Only allow team change during WAITING_FOR_PLAYERS or READY_CHECK phase
    const phase = room.engine.getPhase();
    if (phase !== 'WAITING_FOR_PLAYERS' && phase !== 'READY_CHECK') {
        console.log(`❌ Cannot change team: game in phase ${phase}`);
        sendError(socket, 'Cannot change team after game has started');
        return;
    }

    // Check if player is already on the requested team
    const currentPlayer = room.engine.getPlayer(playerId);
    if (currentPlayer?.team === team) {
        console.log(`ℹ️ Player already on Team ${team}`);
        return; // Already on this team, no action needed
    }

    // Check if a spot is available on the requested team (excluding current player)
    const players = room.engine.getAllPlayers();
    const otherPlayersOnTeam = players.filter(p => p.team === team && p.id !== playerId).length;

    if (otherPlayersOnTeam >= 2) {
        console.log(`❌ Team ${team} is full (${otherPlayersOnTeam}/2 other players)`);
        sendError(socket, `Team ${team} is full`);
        return;
    }

    // Change the team
    if (!room.engine.changePlayerTeam(playerId, team)) {
        console.log('❌ changePlayerTeam returned false');
        sendError(socket, 'Failed to change team');
        return;
    }

    console.log(`🔄 Player ${playerId.slice(0, 8)} changed to Team ${team}`);

    // Notify all players
    roomManager.broadcast(roomCode, {
        type: 'TEAM_CHANGED',
        playerId,
        team,
    });

    broadcastGameState(roomCode, roomManager);
}

function handleReady(socket: WebSocket, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) {
        console.log('❌ Ready failed: room not found');
        return;
    }

    console.log(`✅ Player ${playerId.slice(0, 8)} is ready`);
    room.engine.setPlayerReady(playerId, true);

    // Notify all
    roomManager.broadcast(roomCode, {
        type: 'PLAYER_READY',
        playerId,
    });

    // Broadcast updated game state so UI reflects ready status
    broadcastGameState(roomCode, roomManager);

    // Check if all ready
    if (room.engine.allPlayersReady()) {
        console.log('🎮 All players ready - starting game!');

        // Start game with initial toss
        const tossResult = room.engine.performInitialToss();

        // Send toss result
        const tossCards: Record<PlayerId, any> = {};
        for (const [pid, card] of tossResult.cards) {
            tossCards[pid] = card;
        }

        roomManager.broadcast(roomCode, {
            type: 'TOSS_RESULT',
            cards: tossCards,
            dealerTeam: tossResult.dealerTeam,
            trumpTeam: tossResult.trumpTeam,
        });

        // Deal first 4 cards
        room.engine.dealFirstHalf();

        // Send game state to all
        broadcastGameState(roomCode, roomManager);

        // Send private cards to each player
        sendPrivateCards(roomCode, roomManager);
    }
}

function handlePassVakkai(socket: WebSocket, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    if (!room.engine.passVakkai(playerId)) {
        sendError(socket, 'Cannot pass Vakkai now');
        return;
    }

    roomManager.broadcast(roomCode, {
        type: 'VAKKAI_PASSED',
        playerId,
    });

    broadcastGameState(roomCode, roomManager);
}

function handleDeclareVakkai(socket: WebSocket, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    if (!room.engine.declareVakkai(playerId)) {
        sendError(socket, 'Cannot declare Vakkai now');
        return;
    }

    roomManager.broadcast(roomCode, {
        type: 'VAKKAI_DECLARED',
        playerId,
    });

    // Send remaining cards
    sendPrivateCards(roomCode, roomManager);
    broadcastGameState(roomCode, roomManager);
}

function handleChooseHukum(socket: WebSocket, suit: Suit, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    if (!room.engine.chooseHukum(playerId, suit)) {
        sendError(socket, 'Cannot choose Hukum now');
        return;
    }

    roomManager.broadcast(roomCode, {
        type: 'HUKUM_CHOSEN',
        suit,
        chooserId: playerId,
    });

    // Send remaining cards
    sendPrivateCards(roomCode, roomManager);
    broadcastGameState(roomCode, roomManager);
}

function handlePlayCard(socket: WebSocket, cardId: string, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    const player = room.engine.getPlayer(playerId);
    const card = player?.hand.find(c => c.id === cardId);

    const result = room.engine.playCard(playerId, cardId);

    if (!result.success) {
        sendError(socket, result.error || 'Cannot play card');
        return;
    }

    // Broadcast card played
    roomManager.broadcast(roomCode, {
        type: 'CARD_PLAYED',
        playerId,
        card,
    });

    // Send updated hands to all players (card should vanish from hand)
    sendPrivateCards(roomCode, roomManager);

    // Check for hand/match end
    const gameState = room.engine.getGameState();

    if (gameState.phase === 'HAND_END') {
        // Broadcast hand result (this will be displayed for 2 seconds on client)
        roomManager.broadcast(roomCode, {
            type: 'HAND_END',
            winnerTeam: gameState.dealerTeam!,
            points: 0, // Points are already applied to score
            reason: 'Hand completed',
        });

        // Wait 2 seconds before transitioning to dealer selection
        setTimeout(() => {
            const currentRoom = roomManager.getRoom(roomCode);
            if (currentRoom && currentRoom.engine.getPhase() === 'HAND_END') {
                // Transition to dealer selection
                currentRoom.engine.transitionToDealerSelection();
                broadcastGameState(roomCode, roomManager);
            }
        }, 2000);
    } else if (gameState.phase === 'MATCH_END') {
        roomManager.broadcast(roomCode, {
            type: 'MATCH_END',
            winnerTeam: gameState.score.A >= 16 ? 'A' : 'B',
            finalScore: gameState.score,
        });

        // Auto-restart game after 10 seconds
        setTimeout(() => {
            const currentRoom = roomManager.getRoom(roomCode);
            if (currentRoom) {
                console.log(`🔄 Restarting game in room ${roomCode}`);
                currentRoom.engine.resetMatch();
                broadcastGameState(roomCode, roomManager);
            }
        }, 10000);
    }

    broadcastGameState(roomCode, roomManager);
}

function handleSelectDealer(socket: WebSocket, dealerId: PlayerId, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    if (!room.engine.selectDealer(dealerId)) {
        sendError(socket, 'Cannot select this dealer');
        return;
    }

    // Send new game state and cards
    sendPrivateCards(roomCode, roomManager);
    broadcastGameState(roomCode, roomManager);
}

function handleChatMessage(socket: WebSocket, text: string, roomManager: RoomManager): void {
    const { playerId, roomCode, room } = getPlayerContext(socket, roomManager);
    if (!room) return;

    const player = room.engine.getPlayer(playerId);
    if (!player) return;

    roomManager.broadcast(roomCode, {
        type: 'CHAT_MESSAGE',
        playerId,
        playerName: player.name,
        text,
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getPlayerContext(socket: WebSocket, roomManager: RoomManager): {
    playerId: PlayerId;
    roomCode: string;
    room: ReturnType<RoomManager['getRoom']> | null;
} {
    const playerId = socketToPlayer.get(socket);
    if (!playerId) {
        sendError(socket, 'Not in a room');
        return { playerId: '', roomCode: '', room: null };
    }

    const roomCode = playerRooms.get(playerId);
    if (!roomCode) {
        sendError(socket, 'Room not found');
        return { playerId, roomCode: '', room: null };
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) {
        sendError(socket, 'Room not found');
        return { playerId, roomCode, room: null };
    }

    return { playerId, roomCode, room };
}

function broadcastGameState(roomCode: string, roomManager: RoomManager): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    roomManager.broadcast(roomCode, {
        type: 'GAME_STATE',
        state: room.engine.getPublicState(),
    });
}

function sendPrivateCards(roomCode: string, roomManager: RoomManager): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    for (const player of room.engine.getAllPlayers()) {
        roomManager.sendToPlayer(roomCode, player.id, {
            type: 'PRIVATE_CARDS',
            cards: player.hand,
        });
    }
}

function send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
    }
}

function sendError(socket: WebSocket, message: string): void {
    send(socket, { type: 'ERROR', message });
}
