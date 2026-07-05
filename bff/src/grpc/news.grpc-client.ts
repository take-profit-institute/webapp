/**
 * 실제 NewsService gRPC 클라이언트 (nice-grpc).
 *
 * BFF `market` 도메인의 종목 뉴스 → 백엔드 `candle.news.v1.NewsService` 매핑.
 * 주소는 env.grpc.newsAddr(기본 localhost:50064 = news-service gRPC 포트).
 * GrpcMarketProvider.getNews 가 사용한다. 뉴스는 부가정보이므로 호출부에서
 * 실패 시 빈 배열로 폴백한다(상세 페이지가 뉴스 때문에 죽지 않도록).
 */
import { createClient, type Client } from 'nice-grpc';
import type { NewsItem } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import { NewsServiceDefinition, type NewsArticle } from './gen/candle/news/v1/news';

type NewsServiceClient = Client<typeof NewsServiceDefinition>;

let client: NewsServiceClient | null = null;

function getClient(): NewsServiceClient {
  if (!client) {
    client = createClient(NewsServiceDefinition, getChannel(env.grpc.newsAddr));
  }
  return client;
}

/** 종목 코드로 최근 뉴스 조회. 백엔드는 최신 3건을 내려준다. */
export async function grpcGetStockNews(stockCode: string): Promise<NewsItem[]> {
  const res = await getClient().getStockNews({ stockCode });
  return res.articles.map((a) => toNewsItem(a, stockCode));
}

// ── proto → shared 매핑 ─────────────────────────────────────────────
function toNewsItem(article: NewsArticle, stockCode: string): NewsItem {
  // publishedAt 이 없으면 createdAt(수집 시각)으로 대체, 그것도 없으면 응답 시점.
  const published = article.publishedAt ?? article.createdAt ?? new Date();
  return {
    id: article.id,
    symbol: stockCode,
    title: article.title,
    source: article.source,
    publishedAt: published.toISOString(),
    url: article.url,
  };
}
