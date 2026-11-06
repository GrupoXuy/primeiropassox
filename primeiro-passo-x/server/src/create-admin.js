/* Primeiro Passo X — Criação de administrador (CLI)
   Uso: npm run create-admin -- "Nome do admin" email@exemplo.com 'SenhaForte123'
   Sem senha como argumento? Será solicitada de forma oculta (TTY).
   NENHUM usuário recebe papel admin automaticamente: somente via este comando.
   Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (server/.env.local ou ambiente). */
'use strict';

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { supabase } = require('./db');

const fail = (msg) => { console.error('Erro: ' + msg); process.exit(1); };

const [nome, email, senhaArg] = process.argv.slice(2);
if (!nome || !email) fail('Informe nome e e-mail. Ex.: npm run create-admin -- "Maria Silva" maria@empresa.com');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail('E-mail inválido.');
if (nome.trim().split(/\s+/).filter(Boolean).length < 2) fail('Informe o nome completo.');

const strong = (s) => s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s);

const create = async (senha) => {
  if (!strong(senha)) fail('A senha deve ter ao menos 10 caracteres, com maiúscula, minúscula e número.');
  const normalized = email.toLowerCase();

  const { data: existing, error: selError } = await supabase
    .from('admin_users').select('id').eq('email', normalized).maybeSingle();
  if (selError) fail('Não foi possível consultar o banco: ' + selError.message);
  if (existing) fail('Já existe um administrador com esse e-mail.');

  const hash = bcrypt.hashSync(senha, 12);
  const { data: inserted, error: insError } = await supabase
    .from('admin_users')
    .insert({ nome: nome.trim(), email: normalized, senha_hash: hash, papel: 'admin' })
    .select('id').single();
  if (insError) fail('Não foi possível criar o administrador: ' + insError.message);

  await supabase.from('admin_logs').insert({
    admin_id: inserted.id,
    acao: 'admin_criado',
    detalhes: `Administrador ${normalized} criado via CLI`
  });

  console.log('Administrador criado com sucesso:');
  console.log('  Nome: ' + nome.trim());
  console.log('  E-mail: ' + normalized);
  console.log('  Guarde a senha em local seguro. Ela não será exibida novamente.');
  process.exit(0);
};

if (senhaArg) {
  create(senhaArg).catch((e) => fail(e.message));
} else if (process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Senha do administrador (mín. 10 caracteres, maiúscula/minúscula/número): ', (senha) => {
    rl.close();
    create(senha).catch((e) => fail(e.message));
  });
} else {
  fail('Sem TTY: informe a senha como terceiro argumento.');
}
