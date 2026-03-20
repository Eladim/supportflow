import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Trace files from monorepo root so Docker standalone includes the right graph. */
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
