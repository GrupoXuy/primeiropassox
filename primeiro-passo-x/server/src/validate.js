/* Primeiro Passo X — Validação server-side do cadastro
   Espelha o front-end; a autoridade final é sempre aqui. */
'use strict';

const EXPERIENCIA = ['Sem experiência profissional', 'Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'];
const AREA = ['Vendas / Comercial', 'Atendimento ao cliente', 'Hotelaria / Turismo', 'Restaurantes / Alimentação', 'Logística / Estoque', 'Construção / Manutenção', 'Indústria / Produção', 'Administrativo', 'Tecnologia', 'Saúde', 'Educação', 'Outra / Aberto a oportunidades'];
const ESCOLARIDADE = ['Ensino fundamental', 'Ensino médio completo', 'Técnico / Profissionalizante', 'Superior cursando', 'Superior completo', 'Pós-graduação / Mestrado / Doutorado'];
const INGLES = ['Não falo', 'Básico', 'Intermediário', 'Avançado', 'Fluente'];
const DISP_MUDANCA = ['Imediata', 'Em até 3 meses', 'Em 3 a 6 meses', 'Mais de 6 meses', 'Depende das condições da oportunidade'];
const DISP_INICIO = ['Imediato', 'Até 30 dias', 'Até 60 dias', 'Até 90 dias', 'A combinar / depende da oportunidade'];
const INT_VENDAS = ['Sim — tenho interesse', 'Aberto a avaliar a oportunidade', 'Não tenho interesse em vendas'];
const INT_OUTRAS = ['Sim — tenho interesse', 'Não tenho interesse'];
const PAISES_OK = ['Europa', 'América do Norte', 'América do Sul', 'Ásia', 'Oceania', 'Oriente Médio', 'Sem preferência'];
const VERSAO_CONSENTIMENTO = '1.1';

const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;

function validateCandidato(input) {
  const errors = {};
  const data = {};

  data.nome = str(input.nome, 120);
  if (data.nome.split(/\s+/).filter(Boolean).length < 2) errors.nome = 'Informe nome e sobrenome.';

  data.nascimento = str(input.nascimento, 10);
  const nasc = new Date(data.nascimento + 'T00:00:00');
  if (!data.nascimento || isNaN(nasc) || nasc > new Date() || nasc.getFullYear() < 1900) {
    errors.nascimento = 'Informe uma data de nascimento válida no passado.';
  }

  data.email = str(input.email, 160).toLowerCase();
  if (!emailOk(data.email)) errors.email = 'Informe um e-mail válido.';

  data.telefone = str(input.telefone, 40);
  if (data.telefone.replace(/\D/g, '').length < 8) errors.telefone = 'Informe ao menos 8 dígitos.';

  data.pais_residencia = str(input.paisResidencia || input.pais_residencia, 80);
  if (!data.pais_residencia) errors.pais_residencia = 'Campo obrigatório.';

  data.cidade = str(input.cidade, 80);
  if (!data.cidade) errors.cidade = 'Campo obrigatório.';

  data.nacionalidade = str(input.nacionalidade, 80);
  if (!data.nacionalidade) errors.nacionalidade = 'Campo obrigatório.';

  const enumCheck = (field, value, allowed, label) => {
    const v = str(value, 120);
    if (!allowed.includes(v)) errors[field] = label || 'Opção inválida.';
    return v;
  };

  data.experiencia = enumCheck('experiencia', input.experiencia, EXPERIENCIA);
  data.area = enumCheck('area', input.area, AREA);
  data.escolaridade = enumCheck('escolaridade', input.escolaridade, ESCOLARIDADE);
  data.ingles = enumCheck('ingles', input.ingles, INGLES);
  data.disponibilidade_mudanca = enumCheck('disponibilidade_mudanca', input.disponibilidadeMudanca || input.disponibilidade_mudanca, DISP_MUDANCA);
  data.disponibilidade_inicio = enumCheck('disponibilidade_inicio', input.disponibilidadeInicio || input.disponibilidade_inicio, DISP_INICIO);
  data.interesse_vendas = enumCheck('interesse_vendas', input.interesseVendas || input.interesse_vendas, INT_VENDAS);
  data.interesse_outras = enumCheck('interesse_outras', input.interesseOutras || input.interesse_outras, INT_OUTRAS);

  data.historico = str(input.historico, 3000) || null;
  data.habilidades = str(input.habilidades, 500) || null;
  data.idiomas = str(input.idiomas, 300);
  if (!data.idiomas) errors.idiomas = 'Informe os idiomas que você fala e seu nível.';

  data.linkedin = str(input.linkedin, 300);
  if (data.linkedin) {
    try {
      const u = new URL(data.linkedin);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocolo');
    } catch (_) {
      errors.linkedin = 'Informe uma URL válida (https://…).';
    }
  } else {
    data.linkedin = null;
  }

  /* Países de interesse: array (chegando como JSON string ou array) */
  let paises = input.paises_interesse ?? input.paisesInteresse;
  if (typeof paises === 'string') {
    try { paises = JSON.parse(paises); } catch { paises = paises.split(','); }
  }
  paises = Array.isArray(paises) ? paises.map((p) => str(p, 60)).filter(Boolean) : [];
  data.paises_interesse = [...new Set(paises)].filter((p) => PAISES_OK.includes(p));
  if (data.paises_interesse.length === 0) errors.paises_interesse = 'Selecione ao menos uma opção.';

  /* Vaga de interesse (query-string vinda da página de oportunidades) */
  data.vaga_interesse = str(input.vaga ?? input.vaga_interesse, 120) || null;

  /* Consentimentos — obrigatórios e registrados */
  const bool = (v) => v === true || v === 'true' || v === 'on' || v === '1';
  data.consent_lgpd = bool(input.lgpd ?? input.consent_lgpd);
  data.contato_autorizado = bool(input.contato ?? input.contato_autorizado);
  data.novidades_opt_in = bool(input.novidades ?? input.novidades_opt_in);
  if (!data.consent_lgpd) errors.consent_lgpd = 'É necessário concordar com a Política de Privacidade para prosseguir.';
  if (!data.contato_autorizado) errors.contato_autorizado = 'É necessária a autorização de contato.';

  data.consent_versao = VERSAO_CONSENTIMENTO;
  data.consent_em = new Date().toISOString();

  return { ok: Object.keys(errors).length === 0, errors, data };
}

const STATUS_LABELS = {
  novo: 'Novo cadastro',
  analise: 'Em análise',
  aprovado: 'Perfil aprovado',
  processo: 'Em processo seletivo',
  entrevista: 'Entrevista',
  selecionado: 'Selecionado',
  nao_selecionado: 'Não selecionado',
  banco: 'Banco de talentos'
};
const STATUS_LIST = Object.keys(STATUS_LABELS);

module.exports = { validateCandidato, STATUS_LABELS, STATUS_LIST, VERSAO_CONSENTIMENTO };
