/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    NEXT_PUBLIC_GIS_API_URL: process.env.NEXT_PUBLIC_GIS_API_URL || 'http://localhost:5001',
  },
}

module.exports = nextConfig
