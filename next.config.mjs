/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir imágenes de dominios externos si las necesitamos en el futuro
  images: {
    remotePatterns: [],
  },
  // Headers de seguridad para la app
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
