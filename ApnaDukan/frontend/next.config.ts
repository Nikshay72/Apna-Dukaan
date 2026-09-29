import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5000";

/**
 * dev  (npm run dev):   Next on :3000, proxies /api, /preview, /uploads to Flask on :5000
 * prod (npm run build): static export to ./out, which Flask serves itself (same origin => cookie session works)
 */
export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      reactStrictMode: true,
      async rewrites() {
        return ["api", "preview", "uploads"].map((p) => ({ source: `/${p}/:path*`, destination: `${BACKEND}/${p}/:path*` }));
      },
    };
  }
  return { reactStrictMode: true, output: "export", images: { unoptimized: true } };
}
