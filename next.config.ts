import type { NextConfig } from "next";

// The app's home is https://snow-peak.brian-yu.com. Once that hostname
// resolves, set CANONICAL_HOST to it in the Vercel project's Production
// environment and redeploy: the *.vercel.app production addresses (the old
// snow-peak-2026.vercel.app URL) then redirect there. Leave it unset for
// preview deployments, which have to stay reachable on their own URLs.
const canonicalHost = process.env.CANONICAL_HOST;

const nextConfig: NextConfig = {
  async redirects() {
    if (!canonicalHost) return [];
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '.*\\.vercel\\.app' }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
