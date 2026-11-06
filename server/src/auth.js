/* Primeiro Passo X — Autenticação administrativa
   Cookie httpOnly + HMAC-SHA256 (stateless), sem senha em texto.
   Nenhuma função administra usuários: admins são criados via CLI (create-admin.js). */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const SECRET_PATH = path.join(DATA_DIR, 'secret.key');

function getSecret() {
  const fromEnv = process.env.ADMIN_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.error('[auth] ADMIN_SESSION_SECRET ausente/fraco em produção (mínimo 32 caracteres).');
    process.exit(1);
  }
  try {
    const s = fs.readFileSync(SECRET_PATH, 'utf8').trim();
    if (s.length >= 32) return s;
  } catch (_) { /* cria na primeira execução (dev) */ }
  const secret = crypto.randomBytes(48).toString('hex');
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 }); } catch (_) {}
  return secret;
}
const SECRET = getSecret();
const COOKIE_NAME = 'ppx_admin';
const SESSION_HOURS = 8;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payloadB64) => crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex');

function createSessionCookie(user) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = b64url(JSON.stringify({ sub: user.id, nome: user.nome, email: user.email, exp }));
  const value = `${payload}.${sign(payload)}`;
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_HOURS * 3600}`
  ];
  if (process.env.COOKIE_SECURE === '1') attrs.push('Secure');
  return attrs.join('; ');
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

function getAdminFromRequest(req) {
  const raw = parseCookies(req)[COOKIE_NAME];
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    if (!Number.isInteger(data.sub)) return null;
    return { id: data.sub, nome: data.nome, email: data.email };
  } catch (_) {
    return null;
  }
}

/* Guard para páginas HTML do painel: redireciona para o login */
function requireAdminPage(req, res, next) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    const nextUrl = encodeURIComponent(req.originalUrl || '/admin/');
    return res.redirect(302, `/admin/login.html?next=${nextUrl}`);
  }
  req.admin = admin;
  next();
}

/* Guard para a API administrativa: 401 JSON */
function requireAdminApi(req, res, next) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ ok: false, error: 'Não autenticado.' });
  req.admin = admin;
  next();
}

/* CSRF: mutações exigem header customizado (SameSite=Strict já mitiga; defesa em profundidade) */
function requireFetchHeader(req, res, next) {
  if ((req.headers['x-requested-with'] || '') !== 'fetch') {
    return res.status(403).json({ ok: false, error: 'Requisição inválida (header ausente).' });
  }
  next();
}

/* Rate limit simples em memória (por IP) */
const buckets = new Map();
function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ ok: false, error: message || 'Muitas tentativas. Aguarde alguns minutos.' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 60 * 1000).unref();

module.exports = {
  createSessionCookie, clearSessionCookie,
  getAdminFromRequest, requireAdminPage, requireAdminApi, requireFetchHeader,
  rateLimit, COOKIE_NAME
};
