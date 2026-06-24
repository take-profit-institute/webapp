import { createChannel, ChannelCredentials, type Channel } from 'nice-grpc';

export type GrpcChannel = Channel;

const cache = new Map<string, GrpcChannel>();

/** Returns a singleton channel per address. Safe to call repeatedly. */
export function getChannel(address: string): GrpcChannel {
  const cached = cache.get(address);
  if (cached) return cached;

  const ch = createChannel(address, ChannelCredentials.createInsecure());
  cache.set(address, ch);
  return ch;
}

/** Graceful shutdown — call from Fastify onClose hook. */
export function closeAllChannels(): void {
  cache.forEach((ch) => ch.close());
  cache.clear();
}
