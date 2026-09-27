import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ['192.168.0.106', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Fix: Genkit pulls in @opentelemetry/sdk-node which depends on
  // @opentelemetry/exporter-jaeger (uses native gRPC bindings).
  // These cannot be bundled in Vercel's serverless environment.
  serverExternalPackages: [
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry/sdk-node',
    'genkit',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
  ],
};

export default nextConfig;
