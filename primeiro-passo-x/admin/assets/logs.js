'use strict';
(async function load() {
  const { data } = await api('/admin/api/logs');
  const tbody = document.getElementById('logsBody');
  if (!data || !data.ok) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#b03a2e;padding:1.4rem">Não foi possível carregar a auditoria.</td></tr>'; return; }
  tbody.innerHTML = data.rows.length ? data.rows.map(l => `
    <tr>
      <td>${fmtDate(l.criado_em)}</td>
      <td>${esc(l.admin_nome || '—')}</td>
      <td><code style="background:#eef1f6;border-radius:6px;padding:.1rem .4rem;font-size:.72rem">${esc(l.acao)}</code></td>
      <td>${esc(l.detalhes || '')}</td>
      <td>${l.candidato_id ? `<a href="/admin/candidato.html?id=${l.candidato_id}">#${l.candidato_id}</a>` : '—'}</td>
      <td style="font-size:.7rem;color:var(--muted-2)">${esc(l.ip || '')}</td>
    </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#75839a;padding:1.4rem">Nenhuma ação registrada ainda.</td></tr>';
})().catch(() => {});
