import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { setupWebSocketServer } from './websocket/ws.server';
async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  setupWebSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`[server] Running on http://localhost:${env.PORT}`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
  });

  const shutdown = () => {
    console.log('[server] Shutting down...');
    server.close(() => {
      console.log('[server] Closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
