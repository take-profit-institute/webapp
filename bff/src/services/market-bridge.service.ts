import fp from 'fastify-plugin';
import type { WsQuoteUpdate } from '@candle/shared';
import { env } from '../config/env';

/**
 * market-service ↔ BFF 실시간 시세 브리지.
 *
 * market-service는 Redis 채널 `stock-price`에 도메인 메시지(StockPriceMessage)를 발행한다.
 * BFF의 소비자(market-stream=WS 브로드캐스트, tick-store=초기 스냅샷 버퍼)는 모두 `market:quotes`에서
 * 프론트 WS 계약(WsQuoteUpdate)을 기대한다. 이 브리지가 그 둘을 잇는 유일한 어댑터다:
 *   `stock-price`(raw) → WsQuoteUpdate 변환 → `market:quotes` 재발행
 * → 실시간 스트림과 초기 틱 버퍼가 이 브리지 하나로 함께 채워진다.
 *
 * mock 모드에서는 mock 스트림이 `market:quotes`를 직접 채우므로 비활성화한다.
 */
const SOURCE_CHANNEL = 'stock-price';
const TARGET_CHANNEL = 'market:quotes';

/** market-service StockPriceMessage (Redis JSON). GenericJacksonJsonRedisSerializer가 붙이는 `@class`는 무시. */
interface StockPriceMessage {
  stockCode: string;
  currentPrice: number;
  priceChange: number;
  priceChangeRate: number;
  tradingVolume: number;
  timestamp?: string;
}

export default fp(async (app) => {
  if (env.dataSource === 'mock') return;

  await app.pubsub.subscribe(SOURCE_CHANNEL, (raw) => {
    try {
      const m = JSON.parse(raw) as StockPriceMessage;
      if (!m?.stockCode) return;
      const msg: WsQuoteUpdate = {
        type: 'quote_update',
        data: {
          symbol: m.stockCode,
          price: m.currentPrice,
          change: m.priceChange,
          changePercent: m.priceChangeRate,
          volume: m.tradingVolume,
          // 그래프 x축 — 발행 시각. 누락 시 수신 시각으로 대체.
          timestamp: m.timestamp ?? new Date().toISOString(),
        },
      };
      void app.pubsub.publish(TARGET_CHANNEL, JSON.stringify(msg));
    } catch {
      /* ignore malformed messages */
    }
  });

  app.log.info(`market bridge: '${SOURCE_CHANNEL}' → '${TARGET_CHANNEL}'`);
});
