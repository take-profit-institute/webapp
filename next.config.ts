import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Capacitor wraps a fully static bundle, so export to `out/` instead of running a server.
  output: "export",
  // Trailing slashes make deep routes resolve as `route/index.html` for the in-app file server.
  trailingSlash: true,
  // next/image's optimizer needs a server; serve images as-is in the static bundle.
  images: { unoptimized: true },
};

export default nextConfig;
