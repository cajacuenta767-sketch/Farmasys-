import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // La plantilla de base de datos viaja con la salida standalone (Electron, Docker)
  outputFileTracingIncludes: {
    '/**': ['./prisma/template.db'],
  },
  // El trazado de Turbopack arrastra la raíz del proyecto en las rutas que usan Prisma; fuera de la salida standalone
  // solo deben ir el servidor, node_modules trazado, public/ y la plantilla de base de datos.
  outputFileTracingExcludes: {
    '/**': [
      './src/**', './desktop/**', './mobile/**', './scripts/**', './data/**', './.github/**', './.git/**',
      './prisma/dev.db', './prisma/*.db-journal', './.env', './.env.*',
      './bun.lock', './package-lock.json', './Caddyfile', './Dockerfile', './docker-compose.yml', './README.md',
      './components.json', './eslint.config.mjs', './next.config.ts', './postcss.config.mjs', './tailwind.config.ts',
      './tsconfig.json', './tsconfig.tsbuildinfo', './.dockerignore', './.gitignore', './.npmrc',
    ],
  },
};

export default nextConfig;
