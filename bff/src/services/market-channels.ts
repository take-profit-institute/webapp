/**
 * BFF 시세 pub/sub 채널.
 *
 * - {@link MARKET_SOURCE_CHANNEL}: market-service 백엔드가 발행하는 raw 시세(StockPriceMessage).
 *   백엔드 도메인 계약이라 BFF 가 바꾸지 않는다.
 * - {@link BFF_QUOTES_CHANNEL}: BFF 내부 팬아웃 채널(WsQuoteUpdate). 백엔드의 wishlist 입력 계약
 *   채널인 `market:quotes` 와 스키마가 다르므로, 같은 Redis 를 공유해도 충돌하지 않도록 BFF 전용
 *   이름을 쓴다.
 */
export const MARKET_SOURCE_CHANNEL = 'stock-price';
export const BFF_QUOTES_CHANNEL = 'bff:quotes';
