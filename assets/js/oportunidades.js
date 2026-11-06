/* Primeiro Passo X — renderização e filtros da página de Oportunidades.
   Funciona com o array window.VAGAS (assets/js/vagas-data.js).
   Com o array vazio, exibe o estado oficial "Oportunidades em atualização". */
(function () {
  'use strict';

  const VAGAS = Array.isArray(window.VAGAS) ? window.VAGAS.filter(v => v && v.ativa === true) : [];

  const grid = document.getElementById('jobsGrid');
  const emptyState = document.getElementById('jobsEmpty');
  const resultsInfo = document.getElementById('jobsResultsInfo');
  const filters = {
    pais: document.getElementById('fPais'),
    area: document.getElementById('fArea'),
    experiencia: document.getElementById('fExperiencia'),
    idioma: document.getElementById('fIdioma'),
    tipo: document.getElementById('fTipo')
  };
  const clearBtn = document.getElementById('clearFilters');

  if (!grid || !emptyState) return;

  /* Enter nos filtros não recarrega a página */
  const oppForm = document.getElementById('oppFiltersForm');
  if (oppForm) oppForm.addEventListener('submit', (e) => e.preventDefault());

  const unique = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const allIdiomas = (v) => (Array.isArray(v.idiomas) ? v.idiomas : []);

  /* Popula as opções dos filtros a partir dos dados reais */
  const fillSelect = (select, values, allLabel) => {
    if (!select) return;
    select.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = allLabel;
    select.appendChild(optAll);
    values.forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
    select.disabled = VAGAS.length === 0;
  };

  fillSelect(filters.pais, unique(VAGAS.map(v => v.pais)), VAGAS.length ? 'Todos os países' : 'Sem vagas publicadas');
  fillSelect(filters.area, unique(VAGAS.map(v => v.area)), VAGAS.length ? 'Todas as áreas' : 'Sem vagas publicadas');
  fillSelect(filters.experiencia, unique(VAGAS.map(v => v.experiencia)), VAGAS.length ? 'Toda experiência' : 'Sem vagas publicadas');
  fillSelect(filters.idioma, unique(VAGAS.flatMap(allIdiomas)), VAGAS.length ? 'Todos os idiomas' : 'Sem vagas publicadas');
  fillSelect(filters.tipo, unique(VAGAS.map(v => v.tipo)), VAGAS.length ? 'Todos os tipos' : 'Sem vagas publicadas');

  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatSalary = (s) => {
    if (!s || s.valor == null) return 'A confirmar';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: s.moeda || 'BRL', maximumFractionDigits: 0 }).format(s.valor) + (s.periodo ? ' / ' + s.periodo : '');
    } catch (e) { return s.valor + ' ' + (s.moeda || ''); }
  };

  const matches = (v) => {
    const f = (key, value) => !value || String(v[key] || '') === value;
    if (filters.pais.value && v.pais !== filters.pais.value) return false;
    if (filters.area.value && v.area !== filters.area.value) return false;
    if (filters.experiencia.value && v.experiencia !== filters.experiencia.value) return false;
    if (filters.idioma.value && !allIdiomas(v).includes(filters.idioma.value)) return false;
    if (filters.tipo.value && v.tipo !== filters.tipo.value) return false;
    return true;
  };

  const render = () => {
    const visible = VAGAS.filter(matches);
    grid.innerHTML = visible.map(v => `
      <article class="job-card">
        <div class="job-country">${escapeHTML(v.pais)}${v.cidade ? ' · ' + escapeHTML(v.cidade) : ''}</div>
        <h3>${escapeHTML(v.titulo)}</h3>
        <div class="job-meta">
          <span>${escapeHTML(v.area || '')}</span>
          <span>${escapeHTML(v.experiencia || '')}</span>
          <span>${escapeHTML(formatSalary(v.salario))}</span>
        </div>
        <p>${escapeHTML(v.descricao || '')}</p>
        ${v.prazo ? `<p style="font-size:.72rem;color:#8a6a2f;font-weight:700">Candidaturas até ${escapeHTML(formatDate(v.prazo))}</p>` : ''}
        <a class="btn btn-navy btn-block" href="cadastro.html?vaga=${encodeURIComponent(v.id)}&titulo=${encodeURIComponent(v.titulo)}">Quero esta oportunidade</a>
      </article>`).join('');

    const has = visible.length > 0;
    grid.hidden = !has;
    emptyState.hidden = has;
    if (resultsInfo) {
      resultsInfo.textContent = has
        ? `${visible.length} oportunidade${visible.length > 1 ? 's' : ''} encontrada${visible.length > 1 ? 's' : ''}.`
        : (VAGAS.length ? 'Nenhuma oportunidade corresponde aos filtros.' : '');
    }
  };

  Object.values(filters).forEach(sel => sel && sel.addEventListener('change', render));
  if (clearBtn) clearBtn.addEventListener('click', () => {
    Object.values(filters).forEach(sel => { if (sel) sel.value = ''; });
    render();
  });

  render();
})();
