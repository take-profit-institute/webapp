import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { RawData } from 'ws';
import type { WsClientMessage } from '@candle/shared';

// 무데이터(장 마감·상류 지연) 구간에도 연결을 유지하기 위한 heartbeat 주기.
// ALB idle timeout(300s)보다 충분히 짧게 ping을 보내 연결이 끊기지 않게 하고,
// pong이 없으면(죽은 피어) 정리한다.
const WS_HEARTBEAT_MS = 30_000;

const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    app.marketStream.addClient(socket);

    // Heartbeat: quote_update가 없어도 ping으로 연결을 살려둔다(→ ALB 300s idle 종료 방지).
    let alive = true;
    socket.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { socket.terminate(); return; } // 직전 ping에 pong 없음 → 죽은 연결
      alive = false;
      try { socket.ping(); } catch { /* 소켓이 이미 닫힘 */ }
    }, WS_HEARTBEAT_MS);
    socket.on('close', () => clearInterval(heartbeat));

    socket.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsClientMessage;
        if (msg.type === 'subscribe') {
          app.marketStream.subscribe(socket, msg.symbols);
        } else if (msg.type === 'unsubscribe') {
          app.marketStream.unsubscribe(socket, msg.symbols);
        }
      } catch { /* ignore malformed client messages */ }
    });
  });
};

export default wsRoutes;
