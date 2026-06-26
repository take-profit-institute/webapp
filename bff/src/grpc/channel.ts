import { createChannel, ChannelCredentials, type Channel } from 'nice-grpc';

export type GrpcChannel = Channel;

const cache = new Map<string, GrpcChannel>();

/**
 * grpc-js는 hostname을 DNS resolve할 때 IPv6를 우선 시도한다.
 * Docker Desktop에서 host.docker.internal이 IPv6 ULA로 resolve되면
 * IPv4만 listen 중인 서비스에 ENETUNREACH가 발생하므로 ipv4: 스킴을 강제한다.
 */
function toIPv4Address(address: string): string {
  if (/^(ipv4|ipv6|dns|unix):/.test(address)) return address;
  return `ipv4:${address}`;
}

/** Returns a singleton channel per address. Safe to call repeatedly. */
export function getChannel(address: string): GrpcChannel {
  const cached = cache.get(address);
  if (cached) return cached;

  const ch = createChannel(toIPv4Address(address), ChannelCredentials.createInsecure());
  cache.set(address, ch);
  return ch;
}

/** Graceful shutdown — call from Fastify onClose hook. */
export function closeAllChannels(): void {
  cache.forEach((ch) => ch.close());
  cache.clear();
}
