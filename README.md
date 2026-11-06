# Primeiro Passo X

Plataforma institucional e banco de talentos para conectar brasileiros a oportunidades de trabalho no exterior.

**Slogan:** Conectando você a novas oportunidades.  
**Assinatura:** Trabalhe. Viaje. Mude de vida.

## Estrutura
- Site institucional: páginas HTML na raiz.
- `assets/`: CSS, JavaScript e imagens.
- `admin/`: painel administrativo.
- `server/`: API Express e integração Supabase (somente servidor).
- `api/index.js`: entrada serverless da Vercel.
- `supabase/schema.sql`: estrutura inicial do banco e funções RPC.
- `vercel.json`: roteamento da aplicação na Vercel.

## Requisitos
- Node.js 22.14.0 ou superior.
- Projeto Supabase provisionado.
- Variáveis de ambiente configuradas; nunca versionar chaves ou arquivos .env.

## Desenvolvimento local
1. Instale as dependências na raiz: `npm ci`.
2. Copie `server/.env.example` para `server/.env.local`.
3. Preencha as variáveis do Supabase e um segredo de sessão com pelo menos 32 caracteres.
4. Aplique `supabase/schema.sql` no SQL Editor do projeto Supabase.
5. Execute `npm start` e acesse `http://localhost:8080`.
6. Crie o primeiro administrador pelo terminal: `npm run create-admin -- "Nome" "email@dominio.com"` e informe a senha quando solicitado.

## Variáveis do servidor
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor; nunca expor no navegador)
- `ADMIN_SESSION_SECRET` (mínimo 32 caracteres)
- `SUPABASE_CV_BUCKET` (opcional; padrão `curriculos`)
- `COOKIE_SECURE=1` em produção HTTPS
- `PORT` e `HOST` opcionais no desenvolvimento local

Na Vercel, configure essas variáveis no ambiente do projeto. Não coloque credenciais neste repositório.

## Segurança e dados
- As tabelas do Supabase usam RLS ativado e não possuem policies públicas; o servidor utiliza a chave service_role.
- O bucket de currículos é privado.
- Administradores são criados somente pela CLI.
- Não adicionar candidatos, dados pessoais, currículos, logs ou segredos ao Git.
- O banco deve iniciar sem candidatos, observações e histórico; não criar dados fictícios.
- Não publicar vagas sem validação comercial.

## Estado de publicação
A presença dos arquivos no GitHub não significa que o Supabase foi provisionado ou que a aplicação foi publicada e validada. O deploy na Vercel depende de configuração das variáveis, aplicação do schema, criação do administrador e testes ponta a ponta. Nenhum deploy é realizado por este repositório automaticamente.
