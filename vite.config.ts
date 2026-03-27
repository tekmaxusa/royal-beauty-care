import {existsSync, readFileSync} from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

/**
 * Vite's loadEnv() overwrites values from .env files with existing process.env.
 * A stray VITE_BASE in the shell (e.g. from another project) would break subpath deploys.
 * For `vite build`, prefer VITE_BASE from .env.production on disk.
 */
function viteBaseFromProductionEnvFile(): string | undefined {
  const envPath = path.resolve(__dirname, '.env.production');
  if (!existsSync(envPath)) {
    return undefined;
  }
  const raw = readFileSync(envPath, 'utf8');
  const m = raw.match(/^\s*VITE_BASE\s*=\s*(.+?)\s*$/m);
  if (!m) {
    return undefined;
  }
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  v = v.replace(/\s+#.*$/, '').trim();

  return v !== '' ? v : undefined;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const productionBase = mode === 'production' ? viteBaseFromProductionEnvFile() : undefined;
  const base = ((productionBase ?? env.VITE_BASE) || '/').replace(/\/?$/, '/');
  return {
    base,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
