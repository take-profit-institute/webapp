/**
 * Type-safe parallel gRPC fan-out.
 *
 * Usage:
 *   const { account, holdings } = await parallelFetch({
 *     account:  grpc.account.getAccount({ userId }),
 *     holdings: grpc.account.getHoldings({ userId }),
 *   });
 *
 * All calls fail-fast together (Promise.all semantics).
 * Use parallelFetchSettled when partial failure is acceptable.
 */
export async function parallelFetch<T extends Record<string, Promise<unknown>>>(
  calls: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(calls) as (keyof T)[];
  const results = await Promise.all(keys.map((k) => calls[k]));
  return Object.fromEntries(keys.map((k, i) => [k, results[i]])) as {
    [K in keyof T]: Awaited<T[K]>;
  };
}

/**
 * Fault-tolerant fan-out — individual call failures return null, not a throw.
 *
 * Usage:
 *   const { detail, news } = await parallelFetchSettled({
 *     detail: grpc.market.getStock({ symbol }),
 *     news:   grpc.market.getNews({ symbol }),   // failure → null, rest continues
 *   });
 */
export async function parallelFetchSettled<T extends Record<string, Promise<unknown>>>(
  calls: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> | null }> {
  const keys = Object.keys(calls) as (keyof T)[];
  const results = await Promise.allSettled(keys.map((k) => calls[k]));
  return Object.fromEntries(
    keys.map((k, i) => [
      k,
      results[i].status === 'fulfilled'
        ? (results[i] as PromiseFulfilledResult<unknown>).value
        : null,
    ]),
  ) as { [K in keyof T]: Awaited<T[K]> | null };
}
