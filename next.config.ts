import type { NextConfig } from "next";

const pagesBasePath = process.env.PAGES_BASE_PATH ?? "";
const staticExport = process.env.STATIC_EXPORT === "true" || Boolean(pagesBasePath);

const nextConfig: NextConfig = {
  output: staticExport ? "export" : undefined,
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath ? `${pagesBasePath}/` : undefined,
};

export default nextConfig;
