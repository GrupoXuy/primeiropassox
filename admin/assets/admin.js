/* Primeiro Passo X — Painel administrativo: helpers compartilhados */
'use strict';

const STATUS_LABELS = {
  novo: 'Novo cadastro', analise: 'Em análise', aprovado: 'Perfil aprovado',
  processo: 'Em processo seletivo', entrevista: 'Entrevista', selecionado: 'Selecionado',
  nao_selecionado: 'Não selecionado', banco: 'Banco de talentos'
};
const STATUS_LIST = Object.keys(STATUS_LABELS);
const EXPERIENCIA_LIST = ['Sem experiência profissional', 'Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'];
const INGLES_LIST = ['Não falo', 'Básico', 'Intermediário', 'Avançado', 'Fluente'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(String(iso).trim());
  return isNaN(d) ? esc(iso) : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtDay = (iso) => {
  if (!iso) return '—';
  const d = new Date(String(iso).trim());
  return isNaN(d) ? esc(iso) : d.toLocaleDateString('pt-BR');
};
const protocolo = (id) => 'PPX-' + String(id).padStart(6, '0');
const badge = (status) => `<span class="badge st-${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;

/* fetch com JSON + proteção CSRF leve; redireciona ao login em 401 */
async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  if (res.status === 401) {
    window.location.href = '/admin/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    throw new Error('Não autenticado');
  }
  let data = null;
  try { data = await res.json(); } catch (_) { /* respostas vazias */ }
  return { res, data };
}

let toastTimer = null;
function toast(msg, type) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 4200);
}

/* Preenche nome do admin logado + botão de sair */
async function initHeader() {
  const { data } = await api('/admin/api/me');
  if (!data || !data.ok) return;
  const nomeEl = document.getElementById('adminNome');
  if (nomeEl) nomeEl.textContent = data.nome;
  const emailEl = document.getElementById('adminEmail');
  if (emailEl) emailEl.textContent = data.email;
  if (data.needsPasswordSetup) {
    const currentGroup = document.getElementById('currentPasswordGroup');
    const currentInput = document.getElementById('senhaAtual');
    if (currentGroup) currentGroup.hidden = true;
    if (currentInput) currentInput.required = false;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await api('/admin/api/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });
}
document.addEventListener('DOMContentLoaded', initHeader);
