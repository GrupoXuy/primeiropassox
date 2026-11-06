'use strict';
const CARDS = [
  { key: 'total', label: 'Total de candidatos', cls: 'gold' },
  { key: 'novos7', label: 'Novos (7 dias)' },
  { key: 'emAnalise', label: 'Em análise' },
  { key: 'aprovados', label: 'Aprovados p/ etapas' },
  { key: 'vinculados', label: 'Vinculados a vagas' },
  { key: 'vagasAbertas', label: 'Vagas abertas' },
  { key: 'vagasEncerradas', label: 'Vagas encerradas' }
];

(async function load() {
  const { data } = await api('/admin/api/dashboard');
  if (!data || !data.ok) return toast('Não foi possível carregar o dashboard.', 'err');

  document.getElementById('metricCards').innerHTML = CARDS.map(c => `
    <div class="adm-card ${c.cls || ''}"><small>${esc(c.label)}</small><b>${data[c.key]}</b></div>`).join('');

  const max = Math.max(1, ...Object.values(data.porStatus));
  document.getElementById('statusBars').innerHTML = STATUS_LIST.map(s => {
    const n = data.porStatus[s] || 0;
    return `<div class="status-row"><span>${esc(STATUS_LABELS[s])} — ${badge(s)}</span>
      <span class="bar"><i style="width:${Math.round((n / max) * 100)}%"></i></span><b>${n}</b></div>`;
  }).join('');

  const tbody = document.getElementById('recentesBody');
  tbody.innerHTML = data.recentes.length ? data.recentes.map(r => `
    <tr>
      <td><a href="/admin/candidato.html?id=${r.id}">${protocolo(r.id)}</a></td>
      <td>${esc(r.nome)}</td><td>${esc(r.area)}</td><td>${esc(r.pais_residencia)}</td>
      <td>${badge(r.status)}</td><td>${fmtDay(r.criado_em)}</td>
    </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#75839a;padding:1.2rem">Nenhum candidato cadastrado ainda. Divulgue o site para começar a formar o banco de talentos.</td></tr>';
})().catch(() => {});
