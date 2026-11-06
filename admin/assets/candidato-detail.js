'use strict';
const id = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
const root = document.getElementById('detailRoot');

const DL = (el, pairs) => {
  el.innerHTML = pairs.filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
};

async function load() {
  if (!Number.isInteger(id)) { window.location.href = '/admin/candidatos.html'; return; }
  const { data } = await api('/admin/api/candidatos/' + id);
  if (!data || !data.ok) {
    root.innerHTML = '<div class="adm-panel"><h2>Candidato não encontrado</h2><p>Este registro não existe ou foi excluído.</p><a class="adm-btn solid" href="/admin/candidatos.html">Voltar para a lista</a></div>';
    return;
  }
  const c = data.candidato;
  document.title = `${c.nome} | Painel — Primeiro Passo X`;
  document.getElementById('protocoloLabel').textContent = c.protocolo;
  document.getElementById('candNome').textContent = c.nome;
  document.getElementById('candMeta').textContent = `Cadastro em ${fmtDate(c.criado_em)} · Atualizado em ${fmtDate(c.atualizado_em)}`;
  document.getElementById('statusBadge').innerHTML = badge(c.status);
  document.getElementById('consentInfo').textContent = `Consentimento LGPD: versão ${c.consent_versao} registrado em ${fmtDate(c.consent_em)} · Contato autorizado: ${c.contato_autorizado ? 'sim' : 'não'} · Novidades: ${c.novidades_opt_in ? 'sim' : 'não'}`;

  const sel = document.getElementById('statusSelect');
  sel.innerHTML = STATUS_LIST.map(s => `<option value="${s}" ${s === c.status ? 'selected' : ''}>${esc(STATUS_LABELS[s])}</option>`).join('');

  DL(document.getElementById('dlPessoais'), [
    ['Nome completo', c.nome], ['Data de nascimento', fmtDay(c.nascimento)], ['E-mail', c.email],
    ['Telefone / WhatsApp', c.telefone], ['País de residência', c.pais_residencia], ['Cidade', c.cidade],
    ['Nacionalidade', c.nacionalidade]
  ]);
  DL(document.getElementById('dlProfissional'), [
    ['Experiência', c.experiencia], ['Área', c.area], ['Escolaridade', c.escolaridade],
    ['Inglês', c.ingles], ['Idiomas e níveis', c.idiomas], ['Habilidades', c.habilidades],
    ['Histórico profissional', c.historico], ['LinkedIn', c.linkedin]
  ]);
  DL(document.getElementById('dlInteresse'), [
    ['Países / regiões de interesse', (c.paises_interesse || []).join(', ')],
    ['Disponibilidade para mudança', c.disponibilidade_mudanca],
    ['Disponibilidade para início', c.disponibilidade_inicio],
    ['Interesse em vendas', c.interesse_vendas],
    ['Interesse em outras áreas', c.interesse_outras],
    ['Vaga de interesse', c.vaga_interesse || 'Banco de talentos (sem vaga específica)']
  ]);

  document.getElementById('cvBox').innerHTML = c.cv_filename
    ? `<p style="margin:.1rem 0 .6rem;font-size:.84rem">Arquivo: <strong>${esc(c.cv_original_name || 'curriculo.pdf')}</strong></p>
       <a class="adm-btn solid" href="/admin/api/candidatos/${c.id}/curriculo">Baixar currículo (PDF)</a>`
    : '<p style="margin:.1rem 0 0;font-size:.84rem;color:var(--muted)">Este candidato não anexou currículo.</p>';

  const obsList = document.getElementById('obsList');
  obsList.innerHTML = data.observacoes.length ? data.observacoes.map(o => `
    <li class="obs-item"><small>${esc(o.autor)} · ${fmtDate(o.criado_em)}</small><p>${esc(o.texto)}</p></li>`).join('')
    : '<li style="font-size:.78rem;color:var(--muted-2);padding:.4rem .1rem">Nenhuma observação registrada ainda.</li>';

  const histList = document.getElementById('histList');
  histList.innerHTML = data.historico.length ? data.historico.map(h => `
    <li><strong>${esc(h.acao)}</strong>${h.detalhes ? ' — ' + esc(h.detalhes) : ''}<small>${esc(h.autor)} · ${fmtDate(h.criado_em)}</small></li>`).join('')
    : '<li>Nenhum histórico registrado.</li>';

  root.setAttribute('aria-busy', 'false');
}

document.getElementById('saveStatus').addEventListener('click', async () => {
  const status = document.getElementById('statusSelect').value;
  const { data } = await api(`/admin/api/candidatos/${id}/status`, { method: 'PATCH', body: { status } });
  if (data && data.ok) { toast('Status atualizado.', 'ok'); await load(); }
  else toast((data && data.error) || 'Não foi possível atualizar o status.', 'err');
});

document.getElementById('obsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('obsTexto');
  const texto = input.value.trim();
  if (texto.length < 3) return toast('Escreva ao menos 3 caracteres.', 'err');
  const { data } = await api(`/admin/api/candidatos/${id}/observacoes`, { method: 'POST', body: { texto } });
  if (data && data.ok) { input.value = ''; toast('Observação adicionada.', 'ok'); await load(); }
  else toast((data && data.error) || 'Não foi possível salvar a observação.', 'err');
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  const ok = window.confirm('Excluir DEFINITIVAMENTE este candidato, suas observações, histórico e currículo? Esta ação não pode ser desfeita e será registrada na auditoria.');
  if (!ok) return;
  const { data } = await api(`/admin/api/candidatos/${id}`, { method: 'DELETE' });
  if (data && data.ok) {
    toast('Dados eliminados.', 'ok');
    setTimeout(() => { window.location.href = '/admin/candidatos.html'; }, 800);
  } else {
    toast((data && data.error) || 'Não foi possível excluir.', 'err');
  }
});

load().catch(() => {});
