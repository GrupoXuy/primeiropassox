/* =========================================================================
   BANCO DE VAGAS — Primeiro Passo X
   -------------------------------------------------------------------------
   ESTADO ATUAL: VAZIO. Nenhuma vaga foi publicada porque nenhuma
   oportunidade foi validada ainda. O site exibe automaticamente o estado
   "Oportunidades em atualização".

   QUANDO UMA VAGA REAL FOR VALIDADA, adicione um objeto ao array VAGAS
   seguindo o schema abaixo (todos os campos marcados com * são obrigatórios
   — a publicação sem eles violaria a regra de "nenhuma vaga sem validação"):

   {
     id: 'vaga-001',                 // * único, estável (slug)
     titulo: 'Consultor de Vendas',  // * título real da oportunidade
     pais: 'Portugal',               // * país de destino
     cidade: 'Lisboa',               // * cidade ou "A definir"
     area: 'Vendas / Comercial',     // * mesma taxonomia do cadastro
     tipo: 'CLT / Contrato local',   // * regime/tipo de contratação
     experiencia: '1 a 3 anos',      // * 'Sem experiência' | 'Menos de 1 ano' | '1 a 3 anos' | '3 a 5 anos' | 'Mais de 5 anos'
     idiomas: ['Português nativo', 'Inglês básico'], // * array de idiomas exigidos
     salario: { valor: 1800, moeda: 'EUR', periodo: 'mês' } | null, // null quando não confirmado
     beneficios: ['A definir'] | [], // confirmar antes de publicar
     publicadaEm: '2026-11-20',      // * ISO 8601
     prazo: '2026-12-20',            // * prazo final de candidatura (ISO 8601) ou null
     descricao: '…',                 // * descrição real e verificada
     requisitos: ['…', '…'],         // * requisitos reais e verificados
     ativa: true                     // * false = pausada/encerrada (não exibida)
   }

   Nenhuma vaga será exibida se ativa !== true. Não preencha estes campos
   com estimativas: publicar dados não confirmados quebra a confiança do
   candidato e a regra de publicação da empresa.
   ========================================================================= */
'use strict';

const VAGAS = [];

window.VAGAS = VAGAS;
