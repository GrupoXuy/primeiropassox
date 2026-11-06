/* Carrega server/.env.local em desenvolvimento (sem dependências).
   Em produção (Vercel) as variáveis vêm da plataforma — este arquivo é ignorado. */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(FILE)) {
  for (const raw of fs.readFileSync(FILE, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
