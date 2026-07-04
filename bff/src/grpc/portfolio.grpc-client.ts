/**
 * portfolio-service gRPC 클라이언트 (nice-grpc).
 *
 * BFF `account` 도메인의 조회 뷰 → 백엔드 portfolio-service. proto가 두 서비스로
 * 나뉘어 있어(모두 같은 채널 = env.grpc.portfolioAddr, 기본 localhost:50055):
 *   - HoldingService   : 보유 종목(read model)
 *   - PortfolioService : 계좌 요약/자산추이/섹터비중
 *
 * 미실현손익(current_price 기반)은 portfolio proto에 없다 — 보유 종목의 현재가는
 * 호출부(라우트)가 market provider로 resolve해 넘겨주고, 여기서 평가금액/손익을 계산한다.
 * 모두 조회(read) RPC라 멱등성 키 없이 x-user-id 메타데이터만 싣는다. DATA_SOURCE=grpc일 때만 사용.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import type { Account, Holding, PortfolioPoint, SectorAllocation } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  HoldingServiceDefinition,
  PortfolioServiceDefinition,
  type Holding as ProtoHolding,
} from './gen/candle/portfolio/v1/portfolio';
import { grpcGetBalance } from './trading.grpc-client';

type HoldingClient = Client<typeof HoldingServiceDefinition>;
type PortfolioClient = Client<typeof PortfolioServiceDefinition>;

let holdingClient: HoldingClient | null = null;
let portfolioClient: PortfolioClient | null = null;

function holdings(): HoldingClient {
  return (holdingClient ??= createClient(HoldingServiceDefinition, getChannel(env.grpc.portfolioAddr)));
}
function portfolio(): PortfolioClient {
  return (portfolioClient ??= createClient(PortfolioServiceDefinition, getChannel(env.grpc.portfolioAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });

/** 현재가를 심볼별로 resolve하는 콜백. 라우트가 market provider를 주입한다. */
export type PriceResolver = (symbol: string) => Promise<number | undefined>;

// ── proto → shared ──────────────────────────────────────────────────
function holdingToShared(h: ProtoHolding, currentPrice: number): Holding {
  const quantity = Number(h.quantity);
  const avgPrice = Number(h.averagePrice);
  const costBasis = Number(h.bookValue);
  const totalValue = quantity * currentPrice;
  const profitLoss = totalValue - costBasis;
  return {
    symbol: h.symbol,
    name: h.name || h.symbol,
    sector: h.sector,
    quantity,
    avgPrice,
    currentPrice,
    costBasis,
    totalValue,
    profitLoss,
    profitLossPercent: costBasis > 0 ? (profitLoss / costBasis) * 100 : 0,
    realizedProfit: Number(h.realizedProfit),
    isActive: h.active,
    updatedAt: new Date().toISOString(),
  };
}

// ── HoldingService ──────────────────────────────────────────────────
export async function grpcListHoldings(
  userId: string,
  includeInactive: boolean,
  resolvePrice: PriceResolver,
): Promise<Holding[]> {
  const res = await holdings().listHoldings(
    { userId, includeInactive, page: undefined },
    { metadata: userMeta(userId) },
  );
  return Promise.all(
    res.holdings.map(async (h) => holdingToShared(h, (await resolvePrice(h.symbol)) ?? Number(h.averagePrice))),
  );
}

export async function grpcGetHolding(
  userId: string,
  symbol: string,
  resolvePrice: PriceResolver,
): Promise<Holding | undefined> {
  const res = await holdings().getHolding({ userId, symbol }, { metadata: userMeta(userId) });
  if (!res.holding) return undefined;
  const price = (await resolvePrice(symbol)) ?? Number(res.holding.averagePrice);
  return holdingToShared(res.holding, price);
}

// ── PortfolioService ────────────────────────────────────────────────
/** 계좌 요약 = PortfolioSummary(평가/손익) + AccountService.GetBalance(현금) 병합. */
export async function grpcGetAccountSummary(userId: string): Promise<Account> {
  const [summaryRes, balance] = await Promise.all([
    portfolio().getPortfolioSummary({ userId }, { metadata: userMeta(userId) }),
    grpcGetBalance(userId),
  ]);
  const s = summaryRes.summary;
  const investedAmount = s ? Number(s.totalStockValue) : 0;
  return {
    accountId: userId,
    userId,
    status: 'active',
    currency: 'KRW',
    cash: balance.availableAmount,
    lockedAmount: balance.lockedAmount,
    totalAsset: balance.totalBalance + investedAmount,
    investedAmount,
    totalProfitLoss: s ? Number(s.totalUnrealizedProfit) + Number(s.totalRealizedProfit) : 0,
    totalReturnPercent: s ? Number(s.totalReturnRate) : 0,
    todayProfitLoss: s ? Number(s.dayProfit) : 0,
    todayReturnPercent: s ? Number(s.dayReturnRate) : 0,
    rank: 0, // RankingService 연동 전까지 0 (ranking-service gRPC 미구현)
    updatedAt: new Date().toISOString(),
  };
}

export async function grpcGetPortfolioHistory(userId: string, days: number): Promise<PortfolioPoint[]> {
  const res = await portfolio().getPortfolioHistory({ userId, days }, { metadata: userMeta(userId) });
  return res.snapshots.map((snap) => ({ date: snap.date, value: Number(snap.totalAsset) }));
}

export async function grpcGetSectorAllocation(userId: string): Promise<SectorAllocation[]> {
  const res = await portfolio().getSectorBreakdown({ userId }, { metadata: userMeta(userId) });
  return res.sectors.map((sector) => ({
    sector: sector.sector,
    value: Number(sector.bookValue),
    percent: Number(sector.weight),
  }));
}
