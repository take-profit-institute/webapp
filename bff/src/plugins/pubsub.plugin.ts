import { EventEmitter } from 'events';
import fp from 'fastify-plugin';
import { env } from '../config/env';

export interface PubSubAdapter {
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  quit(): Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    pubsub: PubSubAdapter;
  }
}

export default fp(async (app) => {
  let adapter: PubSubAdapter;

  if (env.redisUrl) {
    const { default: Redis } = await import('ioredis');
    const sub = new Redis(env.redisUrl);
    const pub = new Redis(env.redisUrl);

    sub.on('error', (err) => app.log.error({ err }, 'Redis subscriber error'));
    pub.on('error', (err) => app.log.error({ err }, 'Redis publisher error'));

    adapter = {
      async subscribe(channel, handler) {
        sub.on('message', (ch, msg) => { if (ch === channel) handler(msg); });
        await sub.subscribe(channel);
      },
      async publish(channel, message) {
        await pub.publish(channel, message);
      },
      async quit() {
        await sub.quit();
        await pub.quit();
      },
    };

    app.log.info(`PubSub: Redis @ ${env.redisUrl}`);
  } else {
    // In-process fallback — no Redis needed for local mock dev
    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);

    adapter = {
      async subscribe(channel, handler) { emitter.on(channel, handler); },
      async publish(channel, message) { emitter.emit(channel, message); },
      async quit() { emitter.removeAllListeners(); },
    };

    app.log.info('PubSub: in-process EventEmitter (REDIS_URL not set)');
  }

  app.decorate('pubsub', adapter);
  app.addHook('onClose', () => adapter.quit());
});
