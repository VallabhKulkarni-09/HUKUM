// ============================================
// HUKUM GAME - WEBSOCKET SERVER
// ============================================

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleMessage, handleDisconnect } from './handlers/MessageHandler.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

// Create HTTP server (for Render health checks)
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server: httpServer });

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

// Start listening
httpServer.listen(PORT, () => {
    console.log(`🎴 Hukum Game Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   WebSocket:    ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    wss.close(() => {
        httpServer.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
});

export { wss };
