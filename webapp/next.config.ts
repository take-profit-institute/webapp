import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Capacitor wraps a fully static bundle, while web builds should keep dynamic routes.
  output: isStaticExport ? "export" : undefined,
  // Trailing slashes make deep routes resolve as `route/index.html` for the in-app file server.
  trailingSlash: isStaticExport,
  // next/image's optimizer needs a server; serve images as-is in the static bundle.
  images: { unoptimized: isStaticExport },
};

export default nextConfig;
