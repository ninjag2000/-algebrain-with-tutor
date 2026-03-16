import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function readEnvLocal(envDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(path.join(envDir, '.env.local'), 'utf-8');
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch (_) {}
  return out;
}

export default defineConfig(({ mode }) => {
    const envDir = path.resolve(__dirname);
    const env = loadEnv(mode, envDir, '');
    const envLocal = readEnvLocal(envDir);
    const apiKey = envLocal.OPENROUTER_API_KEY || envLocal.GEMINI_API_KEY
      || env.OPENROUTER_API_KEY || env.GEMINI_API_KEY
      || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey && mode !== 'test') {
      console.warn('[Vite] OPENROUTER_API_KEY not found. Check', path.join(envDir, '.env.local'), 'has: OPENROUTER_API_KEY=sk-or-v1-...');
    }
    return {
      base: './', // относительные пути для корректной загрузки в Capacitor/TestFlight
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey || ''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(apiKey || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
