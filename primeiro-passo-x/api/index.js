/* Vercel Serverless Function — exporta o app Express completo.
   As variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_SESSION_SECRET
   vêm das Environment Variables do projeto na Vercel (nunca do repositório). */
module.exports = require('../server/src/server');
