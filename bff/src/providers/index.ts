import { env } from '../config/env';
import type { MarketProvider } from './market.provider';
import { MockMarketProvider } from './mock-market.provider';
import { GrpcMarketProvider } from './grpc-market.provider';
import { createMarketServiceClient } from '../grpc/clients/market.client';
import { getChannel } from '../grpc/channel';

let marketProvider: MarketProvider | null = null;

/** Returns the configured market provider (singleton), chosen by `DATA_SOURCE`. */
export function getMarketProvider(): MarketProvider {
  if (marketProvider) return marketProvider;

  switch (env.dataSource) {
    case 'grpc':
      marketProvider = new GrpcMarketProvider(
        createMarketServiceClient(getChannel(env.grpc.marketAddr)),
      );
      return marketProvider;

    case 'kis':
      // TODO: return new KisMarketProvider(env.kis) once the OpenAPI keys are wired up.
      throw new Error(
        'DATA_SOURCE=kis is not implemented yet. Add KisMarketProvider and configure KIS_* env vars.',
      );

    case 'mock':
    default:
      marketProvider = new MockMarketProvider();
      return marketProvider;
  }
}
