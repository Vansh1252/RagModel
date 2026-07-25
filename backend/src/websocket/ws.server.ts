import { WebSocketServer } from 'ws';
import http from 'http';
import { handleConnection } from '../modules/chat/chat.gateway';

export function setupWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    handleConnection(ws);
  });

  wss.on('error', (err) => {
    console.error('[wss] Server error:', err);
  });

  console.log('[wss] WebSocket server attached at /ws');
  return wss;
}
