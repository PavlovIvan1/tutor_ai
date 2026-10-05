/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Бинарник ffmpeg нужен только /api/dev/upload (обработка загруженных файлов)
    outputFileTracingIncludes: {
      '/api/dev/upload': ['./node_modules/@ffmpeg-installer/**/*'],
    },
  },
};

module.exports = nextConfig;
