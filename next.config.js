/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // This will allow production builds to complete even if there are typescript errors
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig
