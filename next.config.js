/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
  webpack: (config) => {
    // This is only needed for the scanner page to work with react-qr-reader
    config.resolve.fallback = { 
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig 