/* Primeiro Passo X — Cadastro conectado à API segura e ao banco de talentos. */
(function () {
  'use strict';

  const form = document.getElementById('formulario');
  if (!form) return;

  const statusBox = document.getElementById('formStatus');
  const vagaBanner = document.getElementById('vagaBanner');

  /* ---------- Contexto de vaga vinda da página de oportunidades ---------- */
  const params = new URLSearchParams(window.location.search);
  const vagaId = params.get('vaga');
  const vagaTitulo = params.get('titulo');
  if (vagaBanner && vagaId) {
    vagaBanner.hidden = false;
    vagaBanner.innerHTML = 'Você está demonstrando interesse na oportunidade: <strong>' +
      String(vagaTitulo || vagaId).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) +
      '</strong>. O vínculo formal com a vaga será confirmado pelo nosso time após o envio.';
  }

  /* ---------- Utilitários ---------- */
  const value = (name) => {
    const el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  };
  const checkedGroup = (name) =>
    [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);

  const markField = (name, invalid) => {
    const el = form.elements[name];
    if (el && typeof el.setAttribute === 'function') {
      el.setAttribute('aria-invalid', String(invalid));
      const field = el.closest('.field');
      if (field) field.setAttribute('data-invalid', String(invalid));
      return;
    }
    /* Grupos com o mesmo name (ex.: paisesInteresse) chegam como RadioNodeList;
       nesses casos marcamos o contêiner do grupo. */
    if (name === 'paisesInteresse') {
      const grp = document.getElementById('paisesField');
      if (grp) grp.setAttribute('data-invalid', String(invalid));
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isUrl = (s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };

  /* ---------- Validação (front-end; o back-end revalidará quando existir) ---------- */
  const validate = () => {
    let ok = true;
    const requiredText = ['nome', 'nascimento', 'email', 'telefone', 'paisResidencia', 'cidade', 'nacionalidade',
      'experiencia', 'area', 'escolaridade', 'ingles', 'disponibilidadeMudanca', 'disponibilidadeInicio',
      'interesseVendas', 'interesseOutras'];
    requiredText.forEach((name) => {
      const v = value(name);
      const invalid = !v;
      markField(name, invalid);
      if (invalid) ok = false;
    });

    /* Nome completo: ao menos duas palavras */
    if (value('nome') && value('nome').split(/\s+/).filter(Boolean).length < 2) { markField('nome', true); ok = false; }

    /* E-mail */
    if (value('email') && !emailRegex.test(value('email'))) { markField('email', true); ok = false; }

    /* Data de nascimento válida e no passado */
    const nasc = value('nascimento');
    if (nasc) {
      const d = new Date(nasc);
      const invalid = isNaN(d) || d > new Date();
      markField('nascimento', invalid);
      if (invalid) ok = false;
    }

    /* Telefone: mínimo 8 dígitos */
    if (value('telefone') && value('telefone').replace(/\D/g, '').length < 8) { markField('telefone', true); ok = false; }

    /* LinkedIn (opcional) deve ser URL válida quando preenchido */
    const li = value('linkedin');
    if (li && !isUrl(li)) { markField('linkedin', true); ok = false; }

    /* Idiomas */
    if (!value('idiomas')) { markField('idiomas', true); ok = false; }

    /* Países/regiões de interesse: ao menos uma opção */
    const interesses = checkedGroup('paisesInteresse');
    const interessesField = document.getElementById('paisesField');
    if (interessesField) interessesField.setAttribute('data-invalid', String(interesses.length === 0));
    if (interesses.length === 0) ok = false;

    /* Consentimentos obrigatórios */
    ['lgpd', 'contato'].forEach((name) => {
      const el = form.elements[name];
      const invalid = !el || !el.checked;
      if (el) el.setAttribute('aria-invalid', String(invalid));
      const row = el ? el.closest('.check-row') : null;
      if (row) row.classList.toggle('consent-missing', invalid);
      if (invalid) ok = false;
    });

    /* Currículo (opcional): se anexado, precisa ser PDF de até 4 MB */
    const cvInput = form.elements['cv'];
    const cvField = document.getElementById('cvField');
    let cvInvalid = false;
    if (cvInput && cvInput.files && cvInput.files.length) {
      const f = cvInput.files[0];
      const okType = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      cvInvalid = !okType || f.size > 4 * 1024 * 1024;
    }
    if (cvField) cvField.setAttribute('data-invalid', String(cvInvalid));
    if (cvInput) cvInput.setAttribute('aria-invalid', String(cvInvalid));
    if (cvInvalid) ok = false;

    return ok;
  };

  ['input', 'change'].forEach(evt =>
    form.addEventListener(evt, (e) => {
      const name = e.target.getAttribute('name');
      if (name) markField(name, false);
      if (e.target.type === 'checkbox') e.target.setAttribute('aria-invalid', 'false');
    }, true)
  );

  /* Máscara leve para telefones brasileiros (não bloqueia formatos internacionais) */
  const tel = form.elements['telefone'];
  if (tel) {
    tel.addEventListener('input', () => {
      const digits = tel.value.replace(/\D/g, '');
      if (tel.value.trim().startsWith('+')) return; // internacional: não mascara
      if (digits.length <= 2) tel.value = digits.length ? '(' + digits : '';
      else if (digits.length <= 6) tel.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      else if (digits.length <= 10) tel.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      else tel.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    });
  }

  /* ---------- Resumo do perfil para download ---------- */
  const buildSummary = () => {
    const now = new Date();
    const consentStamp = now.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
    const lines = [
      'PRIMEIRO PASSO X — Resumo do perfil (Banco de talentos)',
      'Gerado em ' + consentStamp + ' (horário local do navegador)',
      'Consentimento LGPD: versão 1.1 da Política de Privacidade — 06/11/2026',
      vagaId ? `Vaga de interesse: ${vagaTitulo || vagaId} (${vagaId})` : 'Interesse: banco de talentos (sem vaga específica)',
      '',
      '— DADOS PESSOAIS —',
      'Nome completo: ' + value('nome'),
      'Data de nascimento: ' + value('nascimento'),
      'E-mail: ' + value('email'),
      'Telefone / WhatsApp: ' + value('telefone'),
      'País de residência: ' + value('paisResidencia'),
      'Cidade: ' + value('cidade'),
      'Nacionalidade: ' + value('nacionalidade'),
      '',
      '— PERFIL PROFISSIONAL —',
      'Experiência profissional: ' + value('experiencia'),
      'Área de atuação: ' + value('area'),
      'Escolaridade: ' + value('escolaridade'),
      'Inglês: ' + value('ingles'),
      'Idiomas e níveis: ' + value('idiomas'),
      'Habilidades: ' + (value('habilidades') || 'Não informado'),
      'Histórico profissional: ' + (value('historico') || 'Não informado'),
      'LinkedIn: ' + (value('linkedin') || 'Não informado'),
      '',
      '— INTERESSE INTERNACIONAL —',
      'Países/regiões de interesse: ' + (checkedGroup('paisesInteresse').join(', ') || 'Não informado'),
      'Disponibilidade para mudança: ' + value('disponibilidadeMudanca'),
      'Disponibilidade para início: ' + value('disponibilidadeInicio'),
      'Interesse em trabalhar com vendas: ' + value('interesseVendas'),
      'Interesse em outras áreas: ' + value('interesseOutras'),
      '',
      '— CONSENTIMENTO —',
      'Li e concordo com a Política de Privacidade (v1.1): ' + (form.elements['lgpd'].checked ? 'SIM' : 'NÃO'),
      'Autorizo contato por e-mail/telefone/WhatsApp: ' + (form.elements['contato'].checked ? 'SIM' : 'NÃO'),
      'Desejo receber novidades da Primeiro Passo X: ' + (form.elements['novidades'].checked ? 'SIM' : 'NÃO'),
      '',
      'Observação: este resumo foi gerado localmente no seu dispositivo.'
    ];
    return lines.join('\n');
  };

  const downloadBtn = document.getElementById('downloadSummary');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!validate()) {
        showStatus('Revise os campos destacados antes de gerar o resumo.', 'warn');
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      const blob = new Blob([buildSummary()], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'primeiro-passo-x-resumo-perfil.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showStatus('Resumo gerado e baixado neste dispositivo. Nenhum dado foi transmitido.', 'ok');
    });
  }

  function showStatus(msg, type) {
    statusBox.textContent = msg;
    statusBox.className = 'form-status show ' + (type || 'warn');
  }

  /* ---------- Envio real: POST /api/candidatos (multipart) ---------- */
  const SERVER_FIELD_MAP = {
    pais_residencia: 'paisResidencia', disponibilidade_mudanca: 'disponibilidadeMudanca',
    disponibilidade_inicio: 'disponibilidadeInicio', interesse_vendas: 'interesseVendas',
    interesse_outras: 'interesseOutras', paises_interesse: null, consent_lgpd: 'lgpd',
    contato_autorizado: 'contato', idiomas: 'idiomas', cv: 'cv'
  };

  const applyServerErrors = (errors) => {
    let first = null;
    Object.entries(errors || {}).forEach(([key, msg]) => {
      if (key === 'paises_interesse') {
        const field = document.getElementById('paisesField');
        if (field) { field.setAttribute('data-invalid', 'true'); if (!first) first = field; }
        return;
      }
      if (key === 'cv') {
        const field = document.getElementById('cvField');
        if (field) { field.setAttribute('data-invalid', 'true'); if (!first) first = field; }
        return;
      }
      const clientName = SERVER_FIELD_MAP[key] !== undefined ? SERVER_FIELD_MAP[key] : key;
      if (clientName) {
        markField(clientName, true);
        const el = form.elements[clientName];
        if (el && !first) first = el;
      }
    });
    return first;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) {
      showStatus('Revise os campos destacados antes de continuar.', 'warn');
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Enviando…';

    try {
      const formData = new FormData(form);
      /* Encaminha o contexto de vaga (?vaga=) da página de oportunidades */
      let url = '/api/candidatos';
      if (vagaId) url += '?vaga=' + encodeURIComponent(vagaId);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'X-Requested-With': 'fetch' },
        body: formData
      });
      const data = await res.json().catch(() => null);

      if (res.status === 201 && data && data.ok) {
        const sucesso = document.getElementById('cadastroSucesso');
        document.getElementById('sucessoProtocolo').textContent = data.protocolo;
        const avisoEmail = document.getElementById('emailAviso');
        if (avisoEmail) avisoEmail.textContent = data.emailEnviado ? 'Seu perfil foi registrado e encaminhado à equipe de recrutamento.' : 'Seu perfil foi registrado com segurança. A equipe poderá consultá-lo na área administrativa.';
        form.hidden = true;
        if (sucesso) { sucesso.hidden = false; sucesso.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        return;
      }

      if (res.status === 400 && data && data.errors) {
        const first = applyServerErrors(data.errors);
        showStatus('O servidor recusou alguns campos — revise os destaques.', 'warn');
        if (first && first.focus) first.focus();
      } else {
        showStatus((data && (data.error || Object.values(data.errors || {})[0])) || 'Não foi possível enviar agora. Tente novamente em instantes.', 'warn');
      }
    } catch (_) {
      showStatus('Falha de conexão ao enviar. Verifique sua internet e tente novamente.', 'warn');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
})();
