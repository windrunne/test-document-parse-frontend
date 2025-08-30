/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000',
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://127.0.0.1:8000',
  },
}

module.exports = nextConfig
