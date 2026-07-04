import fp from 'fastify-plugin';
import { createClient, type Client } from 'nice-grpc';
import { env } from '../config/env';
import { getChannel } from '../grpc/channel';
import { MarketServiceDefinition } from '../grpc/gen/candle/market/v1/market';

/**
 * 실시간 시세 구독 데몬드 매니저 (모델 B 멀티플렉스).
 *
 * 브라우저 뷰어를 심볼별로 ref-count 하고, 심볼 뷰어 0→1 에 `StreamQuotes(symbol)` upstream 을
 * 정확히 1개 연다(1→0 에 닫는다). 같은 종목을 N 명이 봐도 market-service 로 가는 스트림은 1개.
 *
 * 이 gRPC 스트림은 **뷰어 데몬드 시그널**이다 — market-service 는 이 스트림을 보고 키움 실시간을
 * REG/REMOVE 한다. 실제 tick 데이터는 기존 Redis 경로(stock-price → market-bridge → bff:quotes
 * → market-stream 브로드캐스트)로 계속 흐르므로, 여기서는 스트림을 열어두기만 하고 LiveQuote
 * payload 는 소비 후 버린다.
 *
 * "여러 명이 보면 마지막 1명 나갈 때까지 안 닫는다"는 브라우저 단위 판단이 바로 이 refcount 다.
 *
 * @see docs BFF_GRPC_CONTRACT.md §7 (백엔드 레포)
 */
interface MarketDemandService {
  acquire(symbols: string[]): void;
  release(symbols: string[]): void;
}

declare module 'fastify' {
  interface FastifyInstance {
    marketDemand: MarketDemandService;
  }
}

// 뷰어 이탈 후 스트림을 닫기 전 유예 — 상세 새로고침으로 잠깐 0명 됐다 재구독하는 플래핑 방지.
const RELEASE_GRACE_MS = 5000;
// 스트림이 끊겼는데 아직 수요가 있을 때 재연결 지연.
const RECONNECT_DELAY_MS = 1000;

export default fp(async (app) => {
  // grpc 모드에서만 동작. mock/kis 모드는 자체 스트림이 bff:quotes 를 채우므로 no-op.
  const active = env.dataSource === 'grpc';

  const counts = new Map<string, number>();
  const streams = new Map<string, AbortController>();
  const pendingRelease = new Map<string, NodeJS.Timeout>();

  let client: Client<typeof MarketServiceDefinition> | null = null;
  const getClient = () =>
    (client ??= createClient(MarketServiceDefinition, getChannel(env.grpc.marketAddr)));

  function openStream(symbol: string): void {
    if (streams.has(symbol)) return;
    const controller = new AbortController();
    streams.set(symbol, controller);
    void consume(symbol, controller);
  }

  async function consume(symbol: string, controller: AbortController): Promise<void> {
    try {
      const stream = getClient().streamQuotes({ symbol }, { signal: controller.signal });
      // 스트림을 열어두는 것 자체가 데몬드 신호. 데이터는 Redis 경로로 나르므로 payload 는 버린다.
      for await (const quote of stream) void quote;
    } catch (err) {
      if (controller.signal.aborted) return; // 정상 취소(release)
      app.log.warn({ err, symbol }, 'market demand stream error');
    }
    // 서버가 스트림을 끊었는데(재시작 등) 아직 수요가 있으면 재연결.
    if (!controller.signal.aborted && (counts.get(symbol) ?? 0) > 0) {
      streams.delete(symbol);
      setTimeout(() => {
        if ((counts.get(symbol) ?? 0) > 0) openStream(symbol);
      }, RECONNECT_DELAY_MS);
    }
  }

  function closeStream(symbol: string): void {
    const controller = streams.get(symbol);
    if (controller) {
      controller.abort();
      streams.delete(symbol);
    }
  }

  const service: MarketDemandService = {
    acquire(symbols) {
      if (!active) return;
      for (const symbol of symbols) {
        const grace = pendingRelease.get(symbol);
        if (grace) {
          clearTimeout(grace);
          pendingRelease.delete(symbol);
        }
        const next = (counts.get(symbol) ?? 0) + 1;
        counts.set(symbol, next);
        if (next === 1) openStream(symbol);
      }
    },

    release(symbols) {
      if (!active) return;
      for (const symbol of symbols) {
        const current = counts.get(symbol) ?? 0;
        if (current <= 0) continue;
        if (current === 1) {
          counts.delete(symbol);
          // grace 뒤 닫는다. 그 전에 재구독되면 acquire 가 이 타이머를 취소한다.
          const timer = setTimeout(() => {
            pendingRelease.delete(symbol);
            if ((counts.get(symbol) ?? 0) === 0) closeStream(symbol);
          }, RELEASE_GRACE_MS);
          pendingRelease.set(symbol, timer);
        } else {
          counts.set(symbol, current - 1);
        }
      }
    },
  };

  app.decorate('marketDemand', service);

  app.addHook('onClose', () => {
    for (const timer of pendingRelease.values()) clearTimeout(timer);
    for (const controller of streams.values()) controller.abort();
    counts.clear();
    streams.clear();
    pendingRelease.clear();
  });
});
