/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  async rewrites() {
    return []
  },
  // Ensure the server binds to 0.0.0.0 for Replit
  serverRuntimeConfig: {
    host: '0.0.0.0'
  }
};

export default nextConfig;
