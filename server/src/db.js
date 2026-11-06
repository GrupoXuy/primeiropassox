/* Primeiro Passo X — Camada de dados (Supabase Postgres + Storage)
   Cliente service_role, somente no servidor. NUNCA importar no front-end. */
'use strict';

require('./env');

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missing = [];
if (!SUPABASE_URL) missing.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (missing.length) {
  console.error('[primeiro-passo-x] Variáveis ausentes: ' + missing.join(', '));
  console.error('  Desenvolvimento: copie .env.example para server/.env.local e preencha.');
  console.error('  Produção (Vercel): configure em Project → Settings → Environment Variables.');
  process.exit(1);
}

const CV_BUCKET = process.env.SUPABASE_CV_BUCKET || 'curriculos';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-client-info': 'primeiro-passo-x-server' } }
});

const STATUS = ['novo', 'analise', 'aprovado', 'processo', 'entrevista', 'selecionado', 'nao_selecionado', 'banco'];

/* Garante o bucket privado de CVs (idempotente, só no boot) */
async function ensureStorage() {
  try {
    const { data, error } = await supabase.storage.getBucket(CV_BUCKET);
    if (!error && data) return true;
    const { error: createError } = await supabase.storage.createBucket(CV_BUCKET, {
      public: false,
      fileSizeLimit: 4 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf']
    });
    if (createError && !/already exists/i.test(createError.message || '')) {
      console.error('[storage] não foi possível criar/verificar o bucket "' + CV_BUCKET + '":', createError.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[storage] falha ao garantir o bucket:', e.message);
    return false;
  }
}

module.exports = { supabase, STATUS, CV_BUCKET, ensureStorage };
