import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  ErrorResponse,
  StockCatalogDetail,
  StockCodeParams,
  StockPage,
  StockSearchQuery,
} from '@candle/shared';
import { getStockCatalogProvider } from '../providers/stock.provider';

/** 종목 카탈로그(마스터) — stock-service 소유. 시세(market)와 분리. */
const stockRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getStockCatalogProvider();

  app.get(
    '/',
    {
      schema: {
        tags: ['stock'],
        summary: '종목 목록/검색 (페이징·조건검색)',
        querystring: StockSearchQuery,
        response: { 200: StockPage },
      },
    },
    async (req) => provider.searchStocks(req.query),
  );

  app.get(
    '/:code',
    {
      schema: {
        tags: ['stock'],
        summary: '종목 상세 (없으면 키움 fallback)',
        params: StockCodeParams,
        response: { 200: StockCatalogDetail, 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      const stock = await provider.getStock(req.params.code);
      if (!stock) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: `Unknown stock: ${req.params.code}` });
      }
      return stock;
    },
  );
};

export default stockRoutes;
