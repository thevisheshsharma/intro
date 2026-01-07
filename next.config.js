/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'v1.iimcal.ac.in',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Limit sizes to what we actually use
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
}

module.exports = nextConfig
