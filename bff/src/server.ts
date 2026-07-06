import dns from 'dns';
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
