import dns from 'dns';
// Docker Desktop에서 host.docker.internal이 IPv6로 resolve되어 gRPC 연결 실패하는 것 방지
dns.setDefaultResultOrder('ipv4first');

import { buildApp } from './app';
import { env } from './config/env';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Candle BFF running — data source: ${env.dataSource}, docs at /docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
