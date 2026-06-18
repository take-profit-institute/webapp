/**
 * gRPC channel factory — singleton per address.
 *
 * Currently returns opaque stub handles with no real TCP connection.
 *
 * TODO: After `pnpm add nice-grpc @grpc/grpc-js`:
 *   import { createChannel, ChannelCredentials } from 'nice-grpc';
 *   Replace GrpcChannel with the real Channel type.
 *   Replace getChannel() body with createChannel(address, ChannelCredentials.createInsecure())
 *   (Istio/Envoy sidecar handles mTLS at the mesh layer — keep insecure here.)
 */

export interface GrpcChannel {
  readonly address: string;
  close(): void;
}

const cache = new Map<string, GrpcChannel>();

/** Returns a singleton channel per address. Safe to call repeatedly. */
export function getChannel(address: string): GrpcChannel {
  const cached = cache.get(address);
  if (cached) return cached;

  const ch: GrpcChannel = {
    address,
    close() {
      cache.delete(address);
    },
  };

  cache.set(address, ch);
  return ch;
}

/** Graceful shutdown — call from Fastify onClose hook. */
export function closeAllChannels(): void {
  cache.forEach((ch) => ch.close());
  cache.clear();
}
