/* Primeiro Passo X — Acesso a dados (Supabase Postgres + Storage)
   Todas as queries do sistema. Somente servidor. */
'use strict';

const { supabase, STATUS, CV_BUCKET } = require('./db');

const CAND_FIELDS = 'id, nome, nascimento, email, telefone, pais_residencia, cidade, nacionalidade, experiencia, area, historico, escolaridade, habilidades, idiomas, ingles, linkedin, paises_interesse, disponibilidade_mudanca, disponibilidade_inicio, interesse_vendas, interesse_outras, vaga_interesse, cv_filename, cv_original_name, status, consent_versao, consent_em, contato_autorizado, novidades_opt_in, criado_em, atualizado_em';

const sanitizeSearch = (v) => String(v).replace(/[^\p{L}\p{N}@._+ -]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const ilikeEscape = (v) => String(v).replace(/[%_\\]/g, (m) => '\\' + m);
const likeParam = (v) => '%' + ilikeEscape(v) + '%';

/* Aplica os filtros de listagem (compartilhado entre lista, contagem e CSV) */
const applyCandidatoFilters = (query, q) => {
  const term = q && q.q ? sanitizeSearch(q.q) : '';
  if (term) {
    const like = likeParam(term);
    query = query.or(`nome.ilike.${like},email.ilike.${like}`);
  }
  if (q.pais) query = query.eq('pais_residencia', String(q.pais).slice(0, 80));
  if (q.area) query = query.eq('area', String(q.area).slice(0, 80));
  if (q.experiencia) query = query.eq('experiencia', String(q.experiencia).slice(0, 80));
  if (q.idioma) {
    const idioma = String(q.idioma).slice(0, 60);
    const like = likeParam(idioma);
    query = query.or(`ingles.eq.${idioma},idiomas.ilike.${like}`);
  }
  if (q.status && STATUS.includes(String(q.status))) query = query.eq('status', String(q.status));
  return query;
};

const protocol = (id) => 'PPX-' + String(id).padStart(6, '0');
const safeParseArray = (v) => {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch (_) { return []; }
};
const decorate = (r) => ({ ...r, paises_interesse: safeParseArray(r.paises_interesse), protocolo: protocol(r.id) });

/* ---------- Cadastro público (transação atômica no Postgres) ---------- */
async function cadastrarCandidato(data, cv) {
  const { data: result, error } = await supabase.rpc('cadastrar_candidato', {
    p_dados: {
      nome: data.nome, nascimento: data.nascimento, email: data.email, telefone: data.telefone,
      pais_residencia: data.pais_residencia, cidade: data.cidade, nacionalidade: data.nacionalidade,
      experiencia: data.experiencia, area: data.area, historico: data.historico || null,
      escolaridade: data.escolaridade, habilidades: data.habilidades || null, idiomas: data.idiomas, ingles: data.ingles,
      linkedin: data.linkedin || null,
      paises_interesse: data.paises_interesse,
      disponibilidade_mudanca: data.disponibilidade_mudanca, disponibilidade_inicio: data.disponibilidade_inicio,
      interesse_vendas: data.interesse_vendas, interesse_outras: data.interesse_outras,
      vaga_interesse: data.vaga_interesse || null,
      consent_lgpd: data.consent_lgpd, consent_versao: data.consent_versao,
      contato_autorizado: data.contato_autorizado, novidades_opt_in: data.novidades_opt_in
    },
    p_cv_filename: cv ? cv.filename : null,
    p_cv_original_name: cv ? cv.originalName : null,
    p_ip: data.ip || null,
    p_user_agent: data.userAgent || null
  });
  if (error) throw new Error('[rpc cadastrar_candidato] ' + error.message);
  return Number(result);
}

/* ---------- Dashboard ---------- */
async function countExact(table, apply) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) throw new Error('[count ' + table + '] ' + error.message);
  return count || 0;
}

async function getDashboard() {
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [total, novos7, emAnalise, aprovados, vinculados, vagasAbertas, vagasEncerradas, statusCounts, recentes] =
    await Promise.all([
      countExact('candidatos'),
      countExact('candidatos', (q) => q.gte('criado_em', seteDiasAtras)),
      countExact('candidatos', (q) => q.eq('status', 'analise')),
      countExact('candidatos', (q) => q.in('status', ['aprovado', 'processo', 'entrevista', 'selecionado'])),
      countExact('candidaturas'),
      countExact('vagas', (q) => q.eq('status', 'aberta')),
      countExact('vagas', (q) => q.eq('status', 'encerrada')),
      Promise.all(STATUS.map((s) => countExact('candidatos', (q) => q.eq('status', s)).then((n) => [s, n]))),
      supabase.from('candidatos').select('id, nome, area, pais_residencia, status, criado_em')
        .order('criado_em', { ascending: false }).limit(5)
    ]);
  if (recentes.error) throw new Error('[recentes] ' + recentes.error.message);
  const porStatus = Object.fromEntries(statusCounts);
  return { total, novos7, emAnalise, aprovados, vinculados, vagasAbertas, vagasEncerradas, porStatus, recentes: recentes.data || [] };
}

/* ---------- Filtros e listagem ---------- */
async function getFiltrosDistintos() {
  const [p, a] = await Promise.all([
    supabase.from('candidatos').select('pais_residencia').limit(5000),
    supabase.from('candidatos').select('area').limit(5000)
  ]);
  if (p.error) throw new Error('[filtros países] ' + p.error.message);
  if (a.error) throw new Error('[filtros áreas] ' + a.error.message);
  const uniq = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  return { paises: uniq(p.data || [], 'pais_residencia'), areas: uniq(a.data || [], 'area') };
}

async function listCandidatos({ q = {}, page = 1, per = 20 } = {}) {
  let countQuery = supabase.from('candidatos').select('*', { count: 'exact', head: true });
  countQuery = applyCandidatoFilters(countQuery, q);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error('[candidatos count] ' + countError.message);
  const total = count || 0;

  let rowsQuery = supabase.from('candidatos').select(CAND_FIELDS);
  rowsQuery = applyCandidatoFilters(rowsQuery, q)
    .order('criado_em', { ascending: false })
    .range((page - 1) * per, (page - 1) * per + per - 1);
  const { data, error } = await rowsQuery;
  if (error) throw new Error('[candidatos list] ' + error.message);
  return { total, rows: (data || []).map(decorate) };
}

async function listTodosCandidatos({ q = {}, limit = 5000 } = {}) {
  let rowsQuery = supabase.from('candidatos').select(CAND_FIELDS);
  rowsQuery = applyCandidatoFilters(rowsQuery, q).order('criado_em', { ascending: false }).limit(limit);
  const { data, error } = await rowsQuery;
  if (error) throw new Error('[candidatos csv] ' + error.message);
  return (data || []).map(decorate);
}

async function getCandidato(id) {
  const { data, error } = await supabase.from('candidatos').select(CAND_FIELDS).eq('id', id).maybeSingle();
  if (error) throw new Error('[candidato] ' + error.message);
  return data ? decorate(data) : null;
}

async function getDetalhes(id) {
  const [candidato, observacoes, historico] = await Promise.all([
    getCandidato(id),
    supabase.from('candidato_observacoes').select('id, autor, texto, criado_em')
      .eq('candidato_id', id).order('criado_em', { ascending: false }),
    supabase.from('candidato_historico').select('id, acao, detalhes, autor, criado_em')
      .eq('candidato_id', id).order('criado_em', { ascending: false }).order('id', { ascending: false })
  ]);
  if (observacoes.error) throw new Error('[observações] ' + observacoes.error.message);
  if (historico.error) throw new Error('[histórico] ' + historico.error.message);
  return { candidato, observacoes: observacoes.data || [], historico: historico.data || [] };
}

async function setStatus(id, novoStatus, autor) {
  const { data, error } = await supabase.rpc('registrar_status', { p_id: id, p_status: novoStatus, p_autor: autor });
  if (error) throw new Error('[rpc registrar_status] ' + error.message);
  return Boolean(data);
}

async function addObservacao(id, autor, texto) {
  const { data, error } = await supabase.rpc('registrar_observacao', { p_id: id, p_autor: autor, p_texto: texto });
  if (error) throw new Error('[rpc registrar_observacao] ' + error.message);
  return Boolean(data);
}

/* ---------- Currículo (Storage privado) ---------- */
async function uploadCv(filename, buffer, contentType) {
  const { error } = await supabase.storage.from(CV_BUCKET).upload(filename, buffer, {
    contentType: contentType || 'application/pdf',
    upsert: false
  });
  if (error) throw new Error('[storage upload] ' + error.message);
  return filename;
}

async function downloadCv(filename) {
  const { data, error } = await supabase.storage.from(CV_BUCKET).download(filename);
  if (error) throw new Error('[storage download] ' + error.message);
  return Buffer.from(await data.arrayBuffer());
}

async function removeCv(filename) {
  if (!filename) return;
  const { error } = await supabase.storage.from(CV_BUCKET).remove([filename]);
  if (error) console.error('[storage remove] falha ao remover', filename, error.message);
}

async function deleteCandidato(id) {
  const { data: row, error: selError } = await supabase.from('candidatos').select('cv_filename').eq('id', id).maybeSingle();
  if (selError) throw new Error('[candidato delete select] ' + selError.message);
  if (!row) return { deleted: false, cvFilename: null };
  const { error } = await supabase.from('candidatos').delete().eq('id', id);
  if (error) throw new Error('[candidato delete] ' + error.message);
  return { deleted: true, cvFilename: row.cv_filename || null };
}

async function getCvMeta(id) {
  const { data, error } = await supabase.from('candidatos').select('id, cv_filename, cv_original_name, nome').eq('id', id).maybeSingle();
  if (error) throw new Error('[cv meta] ' + error.message);
  return data || null;
}

/* ---------- Admins e logs ---------- */
async function getAdminByEmail(email) {
  const { data, error } = await supabase.from('admin_users').select('id, nome, email, senha_hash').eq('email', email).maybeSingle();
  if (error) throw new Error('[admin por email] ' + error.message);
  return data || null;
}

async function getAdminById(id) {
  const { data, error } = await supabase.from('admin_users').select('id, nome, email, senha_hash').eq('id', id).maybeSingle();
  if (error) throw new Error('[admin por id] ' + error.message);
  return data || null;
}

async function getAdminEmailsByIds(ids) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('admin_users').select('id, nome').in('id', ids);
  if (error) throw new Error('[admin nomes] ' + error.message);
  return new Map((data || []).map((r) => [r.id, r.nome]));
}

async function updateAdminSenha(id, senhaHash) {
  const { error } = await supabase.from('admin_users').update({ senha_hash: senhaHash }).eq('id', id);
  if (error) throw new Error('[admin senha] ' + error.message);
}

async function logAdmin({ adminId = null, acao, detalhes = null, candidatoId = null, ip = null }) {
  try {
    const { error } = await supabase.from('admin_logs')
      .insert({ admin_id: adminId, acao, detalhes, candidato_id: candidatoId, ip });
    if (error) console.error('[logs] falha ao registrar:', error.message);
  } catch (e) { console.error('[logs] falha ao registrar:', e.message); }
}

async function listLogs(limit = 100) {
  const { data, error } = await supabase.from('admin_logs')
    .select('id, admin_id, acao, detalhes, candidato_id, ip, criado_em')
    .order('criado_em', { ascending: false })
    .limit(limit);
  if (error) throw new Error('[logs] ' + error.message);
  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.admin_id).filter((n) => Number.isInteger(n)))];
  const nomes = await getAdminEmailsByIds(ids);
  return rows.map((r) => ({ ...r, admin_nome: r.admin_id ? nomes.get(r.admin_id) || null : null }));
}

module.exports = {
  protocol, safeParseArray,
  cadastrarCandidato, getDashboard, getFiltrosDistintos,
  listCandidatos, listTodosCandidatos, getCandidato, getDetalhes,
  setStatus, addObservacao,
  uploadCv, downloadCv, removeCv, deleteCandidato, getCvMeta,
  getAdminByEmail, getAdminById, updateAdminSenha, logAdmin, listLogs
};
