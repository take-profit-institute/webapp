/**
 * wishlist-service gRPC 클라이언트 (nice-grpc).
 *
 * BFF `account` 도메인의 관심종목(watchlist) 저장소 → 백엔드 wishlist-service
 * (채널 = env.grpc.wishlistAddr, 기본 localhost:50061).
 *
 * wishlist-service는 "어떤 종목이 관심목록에 있는가"만 관리한다 — 시세(Quote)는 별개
 * 관심사라 라우트가 market 경로로 머지한다. 여기서는 목록/추가/삭제만 담당한다.
 * 쓰기(add/remove)는 idempotencyKey를 metadata + command_metadata 양쪽에 주입한다.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import { env } from '../config/env';
import { getChannel } from './channel';
import { WishlistServiceDefinition } from './gen/candle/wishlist/v1/wishlist';

type WishlistClient = Client<typeof WishlistServiceDefinition>;

let wishlistClient: WishlistClient | null = null;
function wishlist(): WishlistClient {
  return (wishlistClient ??= createClient(WishlistServiceDefinition, getChannel(env.grpc.wishlistAddr)));
}

const callMetadata = (idempotencyKey: string, userId: string): Metadata =>
  Metadata({ 'x-idempotency-key': idempotencyKey, 'x-user-id': userId });

/** 관심종목 1건 (시세 제외 — 목록 소유 정보만). */
export interface WatchlistEntry {
  symbol: string;
  name: string;
  market: string;
  addedAt: string;
}

// ── WishlistService ─────────────────────────────────────────────────
export async function grpcListWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const res = await wishlist().listWishlistItems(
    { userId, pageRequest: undefined },
    { metadata: Metadata({ 'x-user-id': userId }) },
  );
  return res.items.map((i) => ({
    symbol: i.symbol,
    name: i.displayName || i.symbol,
    market: i.market,
    addedAt: (i.createdAt ?? new Date()).toISOString(),
  }));
}

export interface GrpcAddWatchlistInput {
  userId: string;
  symbol: string;
  displayName: string;
  market: string;
  idempotencyKey: string;
}

export async function grpcAddWatchlist(input: GrpcAddWatchlistInput): Promise<WatchlistEntry> {
  const res = await wishlist().addWishlistItem(
    {
      userId: input.userId,
      symbol: input.symbol,
      displayName: input.displayName,
      market: input.market,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  const item = res.item;
  return {
    symbol: item?.symbol ?? input.symbol,
    name: item?.displayName || input.displayName || input.symbol,
    market: item?.market ?? input.market,
    addedAt: (item?.createdAt ?? new Date()).toISOString(),
  };
}

export async function grpcRemoveWatchlist(input: {
  userId: string;
  symbol: string;
  idempotencyKey: string;
}): Promise<void> {
  await wishlist().removeWishlistItem(
    {
      userId: input.userId,
      symbol: input.symbol,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
}
