import type { NextConfig } from "next";

// The app lives at brian-yu.com/snow-peak. The personal-site project
// (about-brian) rewrites /snow-peak/* to this deployment, so every page,
// asset and API route has to be served under this prefix.
const basePath = '/snow-peak';

const nextConfig: NextConfig = {
  basePath,
  // Lets client code (src/lib/basePath.ts) prefix fetch() calls and raw asset URLs.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async redirects() {
    // Requests that arrive without the prefix (the old production URL,
    // preview deployments, local dev) are sent to the prefixed equivalent.
    const oldHost = { type: 'host' as const, value: 'snow-peak-2026.vercel.app' };
    const unprefixed = '/:path((?!snow-peak(?:/|$)).*)';
    return [
      { source: '/', has: [oldHost], destination: `https://brian-yu.com${basePath}`, permanent: false, basePath: false },
      { source: unprefixed, has: [oldHost], destination: `https://brian-yu.com${basePath}/:path`, permanent: false, basePath: false },
      { source: '/', destination: basePath, permanent: false, basePath: false },
      { source: unprefixed, destination: `${basePath}/:path`, permanent: false, basePath: false },
    ];
  },
};

export default nextConfig;
