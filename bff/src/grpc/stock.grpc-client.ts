/**
 * 실제 StockService gRPC 클라이언트 (nice-grpc).
 *
 * BFF `stock` 카탈로그 도메인 → 백엔드 `candle.stock.v1.StockService` 매핑.
 * 주소는 env.grpc.stockAddr(기본 localhost:50055 = stock-service gRPC 포트).
 * DATA_SOURCE=grpc 일 때 GrpcStockCatalogProvider 가 사용한다.
 */
import { createClient, type Client } from 'nice-grpc';
import { ClientError } from 'nice-grpc';
import type { StockCatalogDetail, StockPage, StockSearchQuery, StockSummary } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import { GrpcStatus } from './types';
import {
  StockServiceDefinition,
  MarketType,
  ListingStatus,
  StockSort,
  listingStatusToJSON,
  marketTypeToJSON,
  dataSourceToJSON,
  type DataSource,
  type Stock,
  type StockDetail,
} from './gen/candle/stock/v1/stock';

type StockServiceClient = Client<typeof StockServiceDefinition>;

let client: StockServiceClient | null = null;

function getClient(): StockServiceClient {
  if (!client) {
    client = createClient(StockServiceDefinition, getChannel(env.grpc.stockAddr));
  }
  return client;
}

export async function grpcSearchStocks(query: StockSearchQuery): Promise<StockPage> {
  const res = await getClient().searchStocks({
    query: query.q ?? '',
    market: marketToProto(query.market),
    sector: query.sector ?? '',
    status: statusToProto(query.status),
    sort: sortToProto(query.sort),
    page: query.page ?? 0,
    size: query.size ?? 20,
  });
  return {
    items: res.stocks.map(toSummary),
    totalElements: Number(res.totalElements),
    totalPages: res.totalPages,
    page: res.page,
    size: res.size,
  };
}

/** NOT_FOUND → undefined (404로 변환). */
export async function grpcGetStock(code: string): Promise<StockCatalogDetail | undefined> {
  try {
    const res = await getClient().getStock({ code, allowFallback: true });
    if (!res.stock) return undefined;
    return toDetail(res.stock, res.source);
  } catch (err) {
    if (err instanceof ClientError && err.code === GrpcStatus.NOT_FOUND) return undefined;
    throw err;
  }
}

// ── proto → shared 매핑 ─────────────────────────────────────────────
// stock-service(=DB stocks) 의 금액 필드(시총·매출·이익)는 억원 단위다. 프론트 포매터는 원 단위를
// 기대하므로(예: formatMarketCap 은 /1e8 로 억을 만든다) BFF 경계에서 원 단위로 정규화한다.
const EOK = 100_000_000; // 1억 (억원 → 원)

function toSummary(s: Stock): StockSummary {
  return {
    code: s.code,
    name: s.name,
    market: marketTypeToJSON(s.market),
    sector: s.sector,
    marketCap: Number(s.marketCap) * EOK,
    sharesOutstanding: Number(s.sharesOutstanding),
    status: listingStatusToJSON(s.status),
  };
}

function toDetail(detail: StockDetail, source: DataSource): StockCatalogDetail {
  const summary = detail.stock ? toSummary(detail.stock) : emptySummary();
  const f = detail.financials;
  return {
    ...summary,
    description: detail.description ?? '',
    source: dataSourceToJSON(source),
    ...(f
      ? {
          financials: {
            revenue: Number(f.revenue) * EOK,
            operatingProfit: Number(f.operatingProfit) * EOK,
            netIncome: Number(f.netIncome) * EOK,
            per: Number(f.per) || 0,
            pbr: Number(f.pbr) || 0,
            roe: Number(f.roe) || 0,
            fiscalPeriod: f.fiscalPeriod,
          },
        }
      : {}),
  };
}

function emptySummary(): StockSummary {
  return { code: '', name: '', market: '', sector: '', marketCap: 0, sharesOutstanding: 0, status: '' };
}

function marketToProto(market?: string): MarketType {
  if (market === 'KOSPI') return MarketType.KOSPI;
  if (market === 'KOSDAQ') return MarketType.KOSDAQ;
  return MarketType.MARKET_TYPE_UNSPECIFIED;
}

function statusToProto(status?: string): ListingStatus {
  switch (status) {
    case 'LISTED': return ListingStatus.LISTED;
    case 'DELISTED': return ListingStatus.DELISTED;
    case 'SUSPENDED': return ListingStatus.SUSPENDED;
    default: return ListingStatus.LISTING_STATUS_UNSPECIFIED;
  }
}

function sortToProto(sort?: string): StockSort {
  switch (sort) {
    case 'NAME_ASC': return StockSort.NAME_ASC;
    case 'MARKET_CAP_DESC': return StockSort.MARKET_CAP_DESC;
    case 'CODE_ASC': return StockSort.CODE_ASC;
    default: return StockSort.STOCK_SORT_UNSPECIFIED;
  }
}
