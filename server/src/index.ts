// ============================================
// HUKUM GAME - WEBSOCKET SERVER
// ============================================

import { WebSocketServer, WebSocket } from 'ws';
import { handleMessage, handleDisconnect } from './handlers/MessageHandler.js';

const PORT = 3001;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`🎴 Hukum Game Server running on ws://localhost:${PORT}`);

wss.on('connection', (socket: WebSocket) => {
    console.log('🔗 New player connected');

    socket.on('message', (data: Buffer) => {
        try {
            handleMessage(socket, data.toString());
        } catch (error) {
            console.error('Error handling message:', error);
            socket.send(JSON.stringify({ type: 'ERROR', message: 'Server error' }));
        }
    });

    socket.on('close', () => {
        console.log('❌ Player disconnected');
        handleDisconnect(socket);
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export { wss };
