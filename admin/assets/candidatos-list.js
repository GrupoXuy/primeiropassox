'use strict';
let page = 1;
const per = 20;
const els = {
  q: document.getElementById('fQ'), pais: document.getElementById('fPais'), area: document.getElementById('fArea'),
  experiencia: document.getElementById('fExperiencia'), idioma: document.getElementById('fIdioma'), status: document.getElementById('fStatus')
};
const tbody = document.getElementById('rowsBody');
const info = document.getElementById('resultInfo');
const pageInfo = document.getElementById('pageInfo');

const currentQuery = () => {
  const p = new URLSearchParams();
  if (els.q.value.trim()) p.set('q', els.q.value.trim());
  if (els.pais.value) p.set('pais', els.pais.value);
  if (els.area.value) p.set('area', els.area.value);
  if (els.experiencia.value) p.set('experiencia', els.experiencia.value);
  if (els.idioma.value) p.set('idioma', els.idioma.value);
  if (els.status.value) p.set('status', els.status.value);
  p.set('page', String(page)); p.set('per', String(per));
  return p;
};

async function loadFilters() {
  const { data } = await api('/admin/api/filtros');
  if (!data || !data.ok) return;
  data.paises.forEach(v => els.pais.add(new Option(v, v)));
  data.areas.forEach(v => els.area.add(new Option(v, v)));
}

async function load() {
  const { data } = await api('/admin/api/candidatos?' + currentQuery().toString());
  if (!data || !data.ok) { toast('Não foi possível carregar os candidatos.', 'err'); return; }
  info.textContent = `${data.total} candidato${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}.`;
  pageInfo.textContent = `Página ${data.page} de ${Math.max(1, data.pages)}`;
  document.getElementById('prevPage').disabled = data.page <= 1;
  document.getElementById('nextPage').disabled = data.page >= data.pages;
  tbody.innerHTML = data.rows.length ? data.rows.map(r => `
    <tr>
      <td><a href="/admin/candidato.html?id=${r.id}">${esc(r.protocolo)}</a></td>
      <td>${esc(r.nome)}</td><td>${esc(r.area)}</td><td>${esc(r.pais_residencia)}</td>
      <td>${esc(r.experiencia)}</td><td>${badge(r.status)}</td><td>${fmtDay(r.criado_em)}</td>
      <td><a href="/admin/candidato.html?id=${r.id}">Abrir →</a></td>
    </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:#75839a;padding:1.4rem">Nenhum candidato corresponde aos filtros.</td></tr>';
}

let debounce;
els.q.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { page = 1; load(); }, 300); });
['pais','area','experiencia','idioma','status'].forEach(k => els[k].addEventListener('change', () => { page = 1; load(); }));
document.getElementById('clearFilters').addEventListener('click', () => {
  Object.values(els).forEach(el => { el.value = ''; });
  page = 1; load();
});
document.getElementById('prevPage').addEventListener('click', () => { if (page > 1) { page -= 1; load(); } });
document.getElementById('nextPage').addEventListener('click', () => { page += 1; load(); });
document.getElementById('exportCsv').addEventListener('click', () => {
  const p = currentQuery(); p.delete('page'); p.delete('per');
  window.location.href = '/admin/api/candidatos.csv?' + p.toString();
});

(async () => { await loadFilters(); await load(); })().catch(() => {});
