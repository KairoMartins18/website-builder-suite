import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Política de segurança aplicada só no build (o servidor de desenvolvimento usa scripts inline).
 * Bloqueia scripts injetados em conteúdo do usuário, protegendo a ponte nativa do app desktop.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  'img-src * data: blob:',
  'media-src * data: blob:',
  'frame-src https: data: about:',
  "connect-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'wb-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// base './' para que o build funcione via file:// (Electron).
export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  server: { port: 5173 },
});
