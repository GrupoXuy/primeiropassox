/* =========================================================================
   BANCO DE VAGAS — Primeiro Passo X
   Oportunidades publicadas após confirmação das condições informadas.
   ========================================================================= */
'use strict';

const VAGAS = [
  {
    id: 'consultor-comercial-forex-montevideu',
    titulo: 'Consultor(a) Comercial — Mercado Forex',
    pais: 'Uruguai',
    cidade: 'Montevidéu',
    area: 'Vendas / Comercial',
    tipo: 'Contrato local no Uruguai',
    experiencia: 'Com ou sem experiência',
    idiomas: ['Português'],
    salario: { valor: 32000, moeda: 'UYU', periodo: 'mês' },
    beneficios: [
      'Capacitação profissional para a função',
      'Passagem de viagem para mudança ao Uruguai',
      'Hospedagem inclusa no pacote de mudança',
      'Comissões em dólares conforme desempenho e política comercial'
    ],
    publicadaEm: '2026-11-07',
    prazo: null,
    descricao: 'Oportunidade para atuar na área comercial de uma empresa do segmento financeiro, com foco no mercado Forex, em Montevidéu, Uruguai. Buscamos pessoas com boa comunicação em português, postura profissional e interesse em desenvolver carreira em um ambiente internacional. A vaga está aberta a candidatos com ou sem experiência: a empresa oferece capacitação para o desempenho das atividades e orientação durante a adaptação à função. A remuneração é composta por salário-base de UYU 32.000,00 por mês, acrescido de comissões em dólares, conforme resultados e política comercial. Para apoiar a mudança ao país, o pacote inclui a viagem e hospedagem. A contratação será realizada sob regime local no Uruguai. As candidaturas permanecem abertas, sem prazo final previamente definido.',
    requisitos: [
      'Comunicação em português',
      'Interesse em atuar na área comercial e no segmento financeiro',
      'Disponibilidade para mudança e contratação local no Uruguai',
      'Experiência profissional não obrigatória; haverá capacitação para a função'
    ],
    ativa: true
  }
];

window.VAGAS = VAGAS;
