// ============================================
// HUKUM GAME - ROOM MANAGER
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { Room, PlayerId, Player } from '../types.js';
import { GameEngine, createGameEngine } from '../game/GameState.js';

/**
 * Generate a 6-character room code
 */
function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Room manager - handles all game rooms
 */
export class RoomManager {
    private rooms: Map<string, { engine: GameEngine; playerSockets: Map<PlayerId, WebSocket> }>;

    constructor() {
        this.rooms = new Map();
    }

    /**
     * Create a new room
     */
    createRoom(playerName: string, socket: WebSocket): { roomCode: string; playerId: PlayerId; player: Player } | null {
        let roomCode = generateRoomCode();

        // Ensure unique code
        while (this.rooms.has(roomCode)) {
            roomCode = generateRoomCode();
        }

        const engine = createGameEngine();
        const playerId = uuidv4();
        const player = engine.addPlayer(playerId, playerName);

        if (!player) return null;

        const playerSockets = new Map<PlayerId, WebSocket>();
        playerSockets.set(playerId, socket);

        this.rooms.set(roomCode, { engine, playerSockets });

        return { roomCode, playerId, player };
    }

    /**
     * Join an existing room
     */
    joinRoom(roomCode: string, playerName: string, socket: WebSocket): { playerId: PlayerId; player: Player } | null {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        const playerId = uuidv4();
        const player = room.engine.addPlayer(playerId, playerName);

        if (!player) return null;

        room.playerSockets.set(playerId, socket);

        return { playerId, player };
    }

    /**
     * Get room by code
     */
    getRoom(roomCode: string): { engine: GameEngine; playerSockets: Map<PlayerId, WebSocket> } | undefined {
        return this.rooms.get(roomCode);
    }

    /**
     * Get room code for a player
     */
    getRoomCodeForPlayer(playerId: PlayerId): string | null {
        for (const [code, room] of this.rooms) {
            if (room.playerSockets.has(playerId)) {
                return code;
            }
        }
        return null;
    }

    /**
     * Remove player from room
     */
    removePlayer(roomCode: string, playerId: PlayerId): boolean {
        const room = this.rooms.get(roomCode);
        if (!room) return false;

        room.playerSockets.delete(playerId);
        room.engine.removePlayer(playerId);

        // Remove room if empty
        if (room.playerSockets.size === 0) {
            this.rooms.delete(roomCode);
        }

        return true;
    }

    /**
     * Broadcast message to all players in a room
     */
    broadcast(roomCode: string, message: object, excludePlayer?: PlayerId): void {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const messageStr = JSON.stringify(message);

        for (const [playerId, socket] of room.playerSockets) {
            if (playerId !== excludePlayer && socket.readyState === 1) { // WebSocket.OPEN
                socket.send(messageStr);
            }
        }
    }

    /**
     * Send message to a specific player
     */
    sendToPlayer(roomCode: string, playerId: PlayerId, message: object): void {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const socket = room.playerSockets.get(playerId);
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify(message));
        }
    }

    /**
     * Get all rooms (for debugging)
     */
    getAllRooms(): string[] {
        return [...this.rooms.keys()];
    }
}

/**
 * Create singleton room manager
 */
let roomManagerInstance: RoomManager | null = null;

export function getRoomManager(): RoomManager {
    if (!roomManagerInstance) {
        roomManagerInstance = new RoomManager();
    }
    return roomManagerInstance;
}
