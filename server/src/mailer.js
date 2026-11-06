/* Primeiro Passo X — E-mail transacional SMTP (somente servidor). */
'use strict';
const nodemailer = require('nodemailer');
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'primeiropassorecrutamento@gmail.com').trim().toLowerCase();
const NOTIFICATION_EMAIL = String(process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL).trim();
const BASE_URL = String(process.env.APP_BASE_URL || 'https://primeiropassox.vercel.app').replace(/\/$/, '');
function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}
function transporter() {
  if (!isMailConfigured()) throw new Error('SMTP não configurado. Defina SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM.');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== '0',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    tls: { rejectUnauthorized: true }
  });
}
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function sendCandidateNotification(candidate, cvBuffer, cvOriginalName) {
  const fields = [
    ['Protocolo', candidate.protocolo], ['Nome', candidate.nome], ['Nascimento', candidate.nascimento],
    ['E-mail', candidate.email], ['Telefone', candidate.telefone], ['Residência', `${candidate.cidade}, ${candidate.pais_residencia}`],
    ['Nacionalidade', candidate.nacionalidade], ['Experiência', candidate.experiencia], ['Área', candidate.area],
    ['Histórico profissional', candidate.historico], ['Escolaridade', candidate.escolaridade], ['Habilidades', candidate.habilidades],
    ['Idiomas', candidate.idiomas], ['Inglês', candidate.ingles], ['LinkedIn', candidate.linkedin],
    ['Países de interesse', (candidate.paises_interesse || []).join(', ')], ['Disponibilidade para mudança', candidate.disponibilidade_mudanca],
    ['Disponibilidade para início', candidate.disponibilidade_inicio], ['Interesse em vendas', candidate.interesse_vendas],
    ['Interesse em outras áreas', candidate.interesse_outras], ['Vaga de interesse', candidate.vaga_interesse],
    ['Consentimento LGPD', candidate.consent_lgpd ? 'Sim' : 'Não'], ['Versão do consentimento', candidate.consent_versao],
    ['Contato autorizado', candidate.contato_autorizado ? 'Sim' : 'Não'], ['Novidades', candidate.novidades_opt_in ? 'Sim' : 'Não']
  ];
  const textBody = ['Novo cadastro recebido — Primeiro Passo X', '', ...fields.map(([k,v]) => `${k}: ${v || 'Não informado'}`), '', 'O perfil completo também está disponível na área administrativa.'].join('\n');
  const html = `<h2>Novo cadastro — Primeiro Passo X</h2><table cellpadding="7" cellspacing="0" border="0">${fields.map(([k,v]) => `<tr><th align="left">${esc(k)}</th><td>${esc(v || 'Não informado')}</td></tr>`).join('')}</table><p>O perfil completo está disponível na <a href="${BASE_URL}/admin/candidatos.html">área administrativa</a>.</p>`;
  const attachments = cvBuffer ? [{ filename: String(cvOriginalName || 'curriculo.pdf').replace(/[^\w.\- ]+/g, '_').slice(0, 120), content: cvBuffer, contentType: 'application/pdf' }] : [];
  return transporter().sendMail({ from: process.env.SMTP_FROM, to: NOTIFICATION_EMAIL, replyTo: candidate.email, subject: `[Primeiro Passo X] Novo candidato — ${candidate.nome} (${candidate.protocolo})`, text: textBody, html, attachments });
}
async function sendAdminSetupLink(email, token) {
  const url = `${BASE_URL}/admin/primeiro-acesso.html#email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  return transporter().sendMail({
    from: process.env.SMTP_FROM, to: email, subject: 'Crie sua senha — Primeiro Passo X',
    text: `Foi solicitado o primeiro acesso administrativo da Primeiro Passo X. Para criar sua senha, abra este link válido por 20 minutos: ${url}\n\nSe você não solicitou, ignore esta mensagem.`,
    html: `<p>Foi solicitado o primeiro acesso administrativo da Primeiro Passo X.</p><p><a href="${esc(url)}">Criar minha senha</a></p><p>Este link expira em 20 minutos. Se você não solicitou, ignore esta mensagem.</p>`
  });
}
module.exports = { ADMIN_EMAIL, NOTIFICATION_EMAIL, BASE_URL, isMailConfigured, sendCandidateNotification, sendAdminSetupLink };
