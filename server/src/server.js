/* Primeiro Passo X — Servidor da plataforma
   Site estático + API pública (cadastro) + API administrativa (painel).
   Dados: Supabase Postgres + Storage privado (via src/repo.js). */
'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const { supabase, STATUS, ensureStorage } = require('./db');
const {
  protocol, cadastrarCandidato, getDashboard, getFiltrosDistintos,
  listCandidatos, listTodosCandidatos, getCandidato, getDetalhes,
  setStatus, addObservacao,
  uploadCv, downloadCv, removeCv, deleteCandidato, getCvMeta,
  getAdminByEmail, getAdminById, updateAdminSenha, logAdmin, listLogs
} = require('./repo');
const { STATUS_LABELS, STATUS_LIST, validateCandidato, VERSAO_CONSENTIMENTO } = require('./validate');
const {
  createSessionCookie, clearSessionCookie,
  requireAdminPage, requireAdminApi, requireFetchHeader, rateLimit
} = require('./auth');

const ROOT = path.join(__dirname, '..', '..');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

/* ---------- Cabeçalhos de segurança ---------- */
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
  next();
});

/* ---------- Helpers ---------- */
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
const csvEscape = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const isPdfBuffer = (buf) => buf && buf.length > 5 && buf.subarray(0, 5).toString('utf8') === '%PDF-';

/* ---------- Upload de currículo: PDF ≤ 4 MB, em memória ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const okExt = path.extname(file.originalname || '').toLowerCase() === '.pdf';
    const okMime = (file.mimetype || '').toLowerCase() === 'application/pdf';
    cb(okExt && okMime ? null : new Error('Envie um arquivo PDF válido.'), okExt && okMime);
  }
});

/* ============================================================
   API PÚBLICA
   ============================================================ */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'primeiro-passo-x', version: '1.2.0' }));

app.post('/api/candidatos',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Muitos envios a partir deste IP. Tente novamente em uma hora.' }),
  (req, res, next) => upload.single('cv')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'O PDF excede o limite de 4 MB.' : (err.message || 'Falha no upload do currículo.');
      return res.status(400).json({ ok: false, errors: { cv: msg } });
    }
    next();
  }),
  asyncRoute(async (req, res) => {
    if (req.file && !isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ ok: false, errors: { cv: 'O arquivo enviado não é um PDF válido.' } });
    }

    const body = req.body || {};
    body.vaga = req.query.vaga || body.vaga;
    const { ok, errors, data } = validateCandidato(body);
    if (!ok) return res.status(400).json({ ok: false, errors });

    const ip = clientIp(req);
    let cvFilename = null;
    let cvOriginalName = null;
    try {
      if (req.file) {
        cvFilename = crypto.randomUUID() + '.pdf';
        cvOriginalName = path.basename(req.file.originalname || 'curriculo.pdf').slice(0, 200);
        await uploadCv(cvFilename, req.file.buffer, 'application/pdf');
      }
      const id = await cadastrarCandidato(
        { ...data, ip: ip || null, userAgent: (req.headers['user-agent'] || '').slice(0, 300) || null },
        cvFilename ? { filename: cvFilename, originalName: cvOriginalName } : null
      );
      res.status(201).json({ ok: true, protocolo: protocol(id) });
    } catch (error) {
      if (cvFilename) await removeCv(cvFilename);
      console.error('[candidatos] erro ao salvar:', error.message);
      res.status(500).json({ ok: false, error: 'Não foi possível salvar o cadastro agora. Tente novamente em instantes.' });
    }
  })
);

/* ============================================================
   API ADMINISTRATIVA — autenticação
   ============================================================ */
app.post('/admin/api/primeiro-acesso',
  requireFetchHeader,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Muitas tentativas. Aguarde 15 minutos.' }),
  asyncRoute(async (req, res) => {
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 160);
    const fail = () => res.status(401).json({ ok: false, error: 'Não foi possível iniciar o acesso inicial. Confira o e-mail administrativo ou tente novamente.' });
    if (email !== 'primeiropassorecrutamento@gmail.com') return fail();
    const user = await getAdminByEmail(email);
    /* O acesso sem senha existe somente até a senha inicial ser definida. */
    if (!user || user.senha_definida_em) return fail();
    await logAdmin({ adminId: user.id, acao: 'acesso_inicial_painel', detalhes: 'Acesso inicial para configuração da senha', ip: clientIp(req) });
    res.set('Set-Cookie', createSessionCookie(user));
    res.json({ ok: true, setupRequired: true, nome: user.nome, email: user.email });
  })
);
app.post('/admin/api/login',
  requireFetchHeader,
  rateLimit({ windowMs: 5 * 60 * 1000, max: 5, message: 'Muitas tentativas de login. Aguarde 5 minutos.' }),
  asyncRoute(async (req, res) => {
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 160);
    const senha = String((req.body || {}).senha || '');
    const fail = () => res.status(401).json({ ok: false, error: 'E-mail ou senha incorretos.' });
    if (!email || !senha) return fail();
    const user = await getAdminByEmail(email);
    if (!user || !user.senha_definida_em || !bcrypt.compareSync(senha, user.senha_hash)) return fail();
    await logAdmin({ adminId: user.id, acao: 'login', detalhes: 'Login administrativo', ip: clientIp(req) });
    res.set('Set-Cookie', createSessionCookie(user));
    res.json({ ok: true, nome: user.nome, email: user.email });
  })
);

app.post('/admin/api/logout', requireFetchHeader, requireAdminApi, asyncRoute(async (req, res) => {
  await logAdmin({ adminId: req.admin.id, acao: 'logout', detalhes: 'Logout administrativo', ip: clientIp(req) });
  res.set('Set-Cookie', clearSessionCookie());
  res.json({ ok: true });
}));

app.get('/admin/api/me', requireAdminApi, (req, res) => res.json({ ok: true, nome: req.admin.nome, email: req.admin.email, needsPasswordSetup: Boolean(req.admin.needsPasswordSetup) }));

/* ============================================================
   API ADMINISTRATIVA — dados
   ============================================================ */
const parseFilterArray = (v) => {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch (_) { return []; }
};

app.get('/admin/api/dashboard', requireAdminApi, asyncRoute(async (req, res) => {
  res.json({ ok: true, ...(await getDashboard()) });
}));

app.get('/admin/api/filtros', requireAdminApi, asyncRoute(async (req, res) => {
  res.json({ ok: true, ...(await getFiltrosDistintos()) });
}));

app.get('/admin/api/candidatos', requireAdminApi, asyncRoute(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const per = Math.min(50, Math.max(1, parseInt(req.query.per, 10) || 20));
  const { total, rows } = await listCandidatos({ q: req.query, page, per });
  res.json({ ok: true, total, page, per, pages: Math.ceil(total / per), rows });
}));

app.get('/admin/api/candidatos.csv', requireAdminApi, asyncRoute(async (req, res) => {
  const rows = await listTodosCandidatos({ q: req.query });
  const header = ['Protocolo', 'Nome', 'E-mail', 'Telefone', 'Nascimento', 'País residência', 'Cidade', 'Nacionalidade', 'Experiência', 'Área', 'Escolaridade', 'Inglês', 'Idiomas', 'Países de interesse', 'Disponibilidade mudança', 'Disponibilidade início', 'Interesse vendas', 'Interesse outras áreas', 'Status', 'Consentimento LGPD (versão/data)', 'Cadastro em'];
  const lines = [header.map(csvEscape).join(';')];
  for (const r of rows) {
    lines.push([
      r.protocolo, r.nome, r.email, r.telefone, r.nascimento, r.pais_residencia, r.cidade, r.nacionalidade,
      r.experiencia, r.area, r.escolaridade, r.ingles, r.idiomas, parseFilterArray(r.paises_interesse).join(', '),
      r.disponibilidade_mudanca, r.disponibilidade_inicio, r.interesse_vendas, r.interesse_outras,
      STATUS_LABELS[r.status] || r.status, `v${r.consent_versao} · ${r.consent_em}`, r.criado_em
    ].map(csvEscape).join(';'));
  }
  await logAdmin({ adminId: req.admin.id, acao: 'exportar_csv', detalhes: `Exportação CSV (${rows.length} registros)`, ip: clientIp(req) });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="primeiro-passo-x-candidatos.csv"');
  res.send('﻿' + lines.join('\r\n'));
}));

app.get('/admin/api/candidatos/:id', requireAdminApi, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, error: 'ID inválido.' });
  const { candidato, observacoes, historico } = await getDetalhes(id);
  if (!candidato) return res.status(404).json({ ok: false, error: 'Candidato não encontrado.' });
  res.json({ ok: true, candidato, observacoes, historico });
}));

app.patch('/admin/api/candidatos/:id/status', requireFetchHeader, requireAdminApi, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const novoStatus = String((req.body || {}).status || '');
  if (!Number.isInteger(id) || !STATUS_LIST.includes(novoStatus)) {
    return res.status(400).json({ ok: false, error: 'Status ou ID inválido.' });
  }
  const atual = await getCandidato(id);
  if (!atual) return res.status(404).json({ ok: false, error: 'Candidato não encontrado.' });
  if (atual.status === novoStatus) return res.json({ ok: true, status: novoStatus });
  const anterior = atual.status;
  await setStatus(id, novoStatus, req.admin.email);
  await logAdmin({ adminId: req.admin.id, acao: 'status_alterado', detalhes: `Candidato #${id}: ${anterior} → ${novoStatus}`, candidatoId: id, ip: clientIp(req) });
  res.json({ ok: true, status: novoStatus });
}));

app.post('/admin/api/candidatos/:id/observacoes', requireFetchHeader, requireAdminApi, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const texto = String((req.body || {}).texto || '').trim();
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, error: 'ID inválido.' });
  if (texto.length < 3) return res.status(400).json({ ok: false, error: 'A observação deve ter ao menos 3 caracteres.' });
  if (texto.length > 2000) return res.status(400).json({ ok: false, error: 'A observação excede 2.000 caracteres.' });
  const existe = await getCandidato(id);
  if (!existe) return res.status(404).json({ ok: false, error: 'Candidato não encontrado.' });
  await addObservacao(id, req.admin.email, texto);
  await logAdmin({ adminId: req.admin.id, acao: 'observacao', detalhes: `Observação no candidato #${id}`, candidatoId: id, ip: clientIp(req) });
  res.status(201).json({ ok: true });
}));

app.get('/admin/api/candidatos/:id/curriculo', requireAdminApi, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = Number.isInteger(id) ? await getCvMeta(id) : null;
  if (!row || !row.cv_filename) return res.status(404).json({ ok: false, error: 'Este candidato não anexou currículo.' });
  let pdf;
  try {
    pdf = await downloadCv(row.cv_filename);
  } catch (error) {
    console.error('[currículo] falha no download:', error.message);
    return res.status(404).json({ ok: false, error: 'Arquivo não encontrado no armazenamento.' });
  }
  await logAdmin({ adminId: req.admin.id, acao: 'curriculo_baixado', detalhes: `Currículo do candidato #${id}`, candidatoId: id, ip: clientIp(req) });
  const filename = String(row.cv_original_name || 'curriculo.pdf').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.set('Content-Length', String(pdf.length));
  res.send(pdf);
}));

app.delete('/admin/api/candidatos/:id', requireFetchHeader, requireAdminApi, asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, error: 'ID inválido.' });
  const { deleted, cvFilename } = await deleteCandidato(id);
  if (!deleted) return res.status(404).json({ ok: false, error: 'Candidato não encontrado.' });
  await removeCv(cvFilename); /* cascata no banco já removeu observações e histórico */
  await logAdmin({ adminId: req.admin.id, acao: 'candidato_excluido', detalhes: `Candidato #${id} — dados eliminados a pedido do titular ou por retenção`, ip: clientIp(req) });
  res.json({ ok: true });
}));

app.post('/admin/api/senha', requireFetchHeader, requireAdminApi, asyncRoute(async (req, res) => {
  const { atual, nova } = req.body || {};
  const atualStr = String(atual || '');
  const novaStr = String(nova || '');
  if (novaStr.length < 6) {
    return res.status(400).json({ ok: false, error: 'A nova senha deve ter ao menos 6 caracteres.' });
  }
  const user = await getAdminById(req.admin.id);
  if (!user) return res.status(401).json({ ok: false, error: 'Sessão administrativa inválida.' });
  /* No primeiro acesso, ainda não existe senha confirmada: permite criar a primeira. */
  if (user.senha_definida_em && !bcrypt.compareSync(atualStr, user.senha_hash)) {
    return res.status(401).json({ ok: false, error: 'Senha atual incorreta.' });
  }
  await updateAdminSenha(user.id, bcrypt.hashSync(novaStr, 12));
  await logAdmin({ adminId: req.admin.id, acao: 'senha_alterada', detalhes: 'Senha administrativa alterada', ip: clientIp(req) });
  res.json({ ok: true });
}));

app.get('/admin/api/logs', requireAdminApi, asyncRoute(async (req, res) => {
  res.json({ ok: true, rows: await listLogs(100) });
}));

/* ============================================================
   PAINEL — páginas protegidas / login público
   ============================================================ */
app.use('/admin', (req, res, next) => {
  /* Arquivos públicos do login: a própria página e os assets compartilhados */
  if (req.path === '/login.html' || req.path === '/primeiro-acesso.html' || req.path.startsWith('/assets/')) return next();
  return requireAdminPage(req, res, next);
});

/* ============================================================
   ESTÁTICO + 404
   ============================================================ */
/* Defesa: nunca expor dados, código do servidor ou artefatos internos */
const PRIVATE_ROOTS = new Set(['data', 'server', 'node_modules', 'evidencias', 'evidencias-2-4', 'uploads', 'supabase']);
const PRIVATE_EXACT = new Set(['/package.json', '/package-lock.json', '/vercel.json', '/.env', '/.env.example']);
app.use((req, res, next) => {
  let p = req.path;
  try { p = decodeURIComponent(p); } catch (_) { return res.status(400).end(); }
  p = p.toLowerCase();
  if (PRIVATE_EXACT.has(p)) return res.status(404).end();
  const seg = p.split('/').filter(Boolean);
  if (seg.some((s) => s.startsWith('.'))) return res.status(404).end();
  if (seg.length && PRIVATE_ROOTS.has(seg[0])) return res.status(404).end();
  if (/\.(md|log|key|sqlite|db|db-wal|db-journal|sh|py|csv)$/i.test(p)) return res.status(404).end();
  next();
});

app.use(express.static(ROOT, {
  index: 'index.html',
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.set('Cache-Control', 'no-cache');
  }
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/api/')) {
    return res.status(404).json({ ok: false, error: 'Rota não encontrada.' });
  }
  if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
    return res.status(404).sendFile(path.join(ROOT, '404.html'));
  }
  res.status(404).json({ ok: false, error: 'Não encontrado.' });
});

/* Tratador de erros (nunca vaza stack para o cliente) */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[erro]', err);
  if (res.headersSent) return;
  res.status(500).json({ ok: false, error: 'Erro interno. Nossa equipe foi notificada.' });
});

/* Local/preview: sobe o servidor. Em produção serverless (Vercel),
   api/index.js importa este app sem escutar porta. */
if (require.main === module) {
  (async () => {
    await ensureStorage();
    app.listen(PORT, HOST, () => {
      console.log(`Primeiro Passo X — servidor no ar em http://${HOST}:${PORT}`);
      console.log(`  Site:    http://localhost:${PORT}/`);
      console.log(`  Painel:  http://localhost:${PORT}/admin/login.html`);
      console.log('  Banco:   Supabase (Postgres) + Storage privado');
    });
  })();
}

module.exports = app;
