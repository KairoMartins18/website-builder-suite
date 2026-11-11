// Abre o app Electron.
//   node scripts/electron-dev.mjs         → modo desenvolvimento (Vite com recarga automática)
//   node scripts/electron-dev.mjs --prod  → usa o build de produção em dist/
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const prod = process.argv.includes('--prod');
const env = { ...process.env };
// Se herdado do terminal (ex.: VS Code), faria o Electron rodar como Node puro.
delete env.ELECTRON_RUN_AS_NODE;

let server = null;
if (!prod) {
  const { createServer } = await import('vite');
  server = await createServer({ server: { port: 5173 } });
  await server.listen();
  env.VITE_DEV_SERVER_URL = server.resolvedUrls.local[0];
  console.log(`Vite em ${env.VITE_DEV_SERVER_URL} — abrindo o Electron…`);
}

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env });
child.on('exit', async (code) => {
  await server?.close();
  process.exit(code ?? 0);
});
