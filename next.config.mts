// The app's public address. Behind a proxy that doesn't pass it on as X-Forwarded-Host (such as the
// Cloudflare Worker in deploy/), Server Actions would otherwise reject forms sent from it.
const publicHost = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).host : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      allowedOrigins: publicHost ? [publicHost] : [],
    },
  },
  async redirects() {
    // Notifications used to have their own page; they're now a pop-up behind the bell on the dashboard.
    return [{ source: "/notifications", destination: "/", permanent: false }];
  },
  async headers() {
    return [
      {
        // Marks answers as coming from this app, so deploy/cloudflare-worker.js can tell them from a
        // tunnel's error page and show its "offline" page instead.
        source: "/:path*",
        headers: [{ key: "x-household-app", value: "1" }],
      },
    ];
  },
};

export default nextConfig;
