# Primeiro Passo X — Plataforma institucional e recrutamento internacional

Site institucional da **Primeiro Passo X**: empresa de recrutamento especializada em conectar brasileiros a oportunidades de trabalho no exterior.

- **Slogan:** Conectando você a novas oportunidades.
- **Assinatura:** Trabalhe. Viaje. Mude de vida.
- **Paleta:** azul-marinho profundo (`#071a35`) · dourado metálico (`#c99b52`) · branco · cinza-prateado.

## Status por fase

| Fase | Descrição | Status |
|------|-----------|--------|
| **Fase 1** | Identidade e site institucional | ✅ Entregue |
| **Fase 2** | Banco de talentos: envio real, PDF (opcional), armazenamento com consentimento LGPD v1.1 | ✅ Entregue |
| **Fase 3** | Banco de dados (SQLite em camada de repositório, migração para PostgreSQL/Supabase prevista) + API + autenticação do painel | ✅ Entregue |
| **Fase 4** | Painel administrativo (dashboard, candidatos, status, observações, auditoria LGPD) | ✅ Entregue |
| Fase 5 | Gestão de vagas e candidaturas | ⏳ Aguardando autorização |
| Fase 6 | Segurança, testes e otimização | ⏳ Aguardando autorização |
| Fase 7 | Preparação para publicação | ⏳ Aguardando autorização |

## Como rodar

Tudo roda com um único processo Node (site público + API + painel), sem build e sem dependências externas de front-end (fontes do sistema, CSS/JS locais):

```bash
cd server
npm install        # instala express, better-sqlite3, multer, bcryptjs
npm start          # http://0.0.0.0:8080  (PORT e HOST podem ser definidos por ambiente)
```

Abra `http://localhost:8080` (site) e `http://localhost:8080/admin/login.html` (painel).

**Criar o primeiro administrador** (somente via linha de comando; não existe auto-promoção pela UI):

```bash
cd server
npm run create-admin -- "Nome do Admin" admin@seu-dominio.com.br "SenhaForte123"
# ou de forma interativa (senha não aparece no histórico):
npm run create-admin -- "Nome do Admin" admin@seu-dominio.com.br
```

A senha deve ter ≥ 10 caracteres, com maiúsculas, minúsculas e dígitos. O primeiro acesso deve trocar a senha em `Conta` no painel.

## Estrutura

```
index.html            Página inicial
quem-somos.html       Institucional · propósito · valores · para quem é
como-funciona.html    6 etapas do processo + FAQ acessível
oportunidades.html    Lista dinâmica de vagas (vazia até validação) + filtros
cadastro.html         Banco de talentos — envio real para a API (consentimento LGPD v1.1)
contato.html          Canais oficiais (em preparação) + alerta anti-golpe
privacidade.html      Política de Privacidade LGPD — v1.1 (06/11/2026)
404.html              Página de erro com identidade
robots.txt            Sitemap ativo (domínio oficial: primeiropassox.vercel.app)
sitemap.xml           7 URLs públicas (admin/ fora por noindex + Disallow)
site.webmanifest
admin/                Painel administrativo (login, dashboard, candidatos, conta, logs)
server/               Back-end Node + Express + SQLite (camada de repositório)
  src/db.js           Conexão + schema (migrações idempotentes)
  src/validate.js     Validação/sanitização server-side + consentimento v1.1
  src/auth.js         Sessão HMAC-SHA256 (cookie HttpOnly) + rate limit
  src/server.js       Rotas públicas (/api) e do painel (/admin/api)
  src/create-admin.js CLI de criação de administradores
data/                 (não versionar) SQLite, uploads de PDF e secret.key
assets/
  css/style.css       Design system completo
  js/main.js          Menu/FAQ/reveal/rodapé
  js/cadastro.js      Validação + download do resumo .txt + aviso de não-envio
  js/oportunidades.js Render + filtros a partir de vagas-data.js
  js/vagas-data.js    Array VAGAS (vazio) + schema documentado
  img/                logo.jpeg, hero.jpg, favicons, og-image.jpg, referencia-flyer.jpeg
```

## Identidade visual e assets

> ⚠️ **Atenção — arquivos do ZIP original estavam com os nomes trocados:**
> `logo-primeiro-passo-x.jpeg` continha o **flyer institucional** e
> `referencia-institucional.jpeg` continha a **logomarca 3D**.
> Neste projeto os arquivos foram copiados para `assets/img/` com nomes corretos:
> `logo.jpeg` (logomarca 3D, usada no header/rodapé/favicon) e
> `referencia-flyer.jpeg` (flyer, preservado como referência).
> Os originais em `/uploads` não foram alterados.

- `hero.jpg` foi gerado para o projeto (homem com mochila diante do skyline ao pôr do sol) e otimizado.
- `og-image.jpg`, favicons e ícones de app derivados da logomarca.

## O que é real vs. o que está pendente (honestidade de produto)

**Funciona de verdade:** navegação, menu mobile acessível, FAQ, validação completa do formulário (inclui grupo de checkboxes e consentimentos), máscara de telefone BR, download do resumo do perfil em `.txt` com registro de consentimento (data/hora + versão da política), filtros e renderização dinâmica da página de oportunidades, página 404.

**Não funciona ainda (intencional, à espera das próximas fases):** o botão “Enviar interesse” **não transmite nem armazena dados** — exibe aviso explícito. O envio seguro (banco de dados + API + consentimento registrável) é a Fase 2/3. Currículo em PDF: campo ainda não habilitado (entra na Fase 2). Vagas: nenhuma publicada — `vagas-data.js` está vazio por decisão (não publicar vaga não validada).

**Em preparação/a confirmar com o cliente:** razão social, CNPJ, endereço, e-mail/telefone/WhatsApp oficiais, dados das empresas empregadoras. **Domínio oficial confirmado:** `primeiropassox.vercel.app` (canonical, OG e `sitemap.xml` já configurados).

## Regras respeitadas

- Logomarca original preservada; identidade oficial mantida; nada de vagas/salários/empresas fictícias;
- Sem funcionalidade simulada apresentada como pronta;
- Formulários validados no front-end e com contrato pronto para validação no back-end (Fase 2/3);
- LGPD: consentimento com versão e data, canal de direitos do titular, minimização de dados.

## Próximos passos (dependem de autorização)

1. **Fase 2** — envio real do cadastro: API + persistência + upload de currículo (PDF) + e-mail de confirmação;
2. **Fase 3** — banco de dados (candidatos, consentimentos, histórico), autenticação e RLS/policies;
## Banco de talentos — como funciona (Fases 2–4)

- O candidato preenche o formulário em `cadastro.html` (incluindo **currículo em PDF ≤ 4 MB, opcional**) e clica em **Enviar cadastro**.
- O front-end valida e envia `multipart/form-data` para `POST /api/candidatos`. O servidor **revalida tudo**, confere o magic number do PDF (`%PDF-`), gera o protocolo `PPX-########` e grava em SQLite (`data/primeiro-passo-x.db`) com acesso restrito.
- O consentimento LGPD fica registrado com **versão do termo, data/hora, IP e user-agent**. Protocolo e nome nunca são exibidos publicamente.
- Administradores criados via CLI acessam `/admin/login.html`: dashboard com métricas, busca/filtros/paginação, exportar CSV (com BOM e proteção contra injeção de fórmula), alterar status, registrar observações internas, baixar o CV, **excluir dados sob a LGPD** (remove registro, observações, histórico e arquivo) e consultar a trilha de auditoria (`/admin/logs.html`).
- Não há auto-promoção: administradores só nascem pela CLI; sessões são cookies HttpOnly + SameSite=Strict (8 h), com CSP restritiva (`script-src 'self'`), rate limiting de login e de envio de cadastro.

## Limitações atuais e próximos passos

1. **Domínio oficial confirmado: `primeiropassox.vercel.app`** — canonical, OG absolute e `sitemap.xml` prontos. **Ainda não publicado** (o endereço responde `404 DEPLOYMENT_NOT_FOUND` até o primeiro deploy — ver item 7).
2. **Canais oficiais (e-mail/WhatsApp) em preparação** → nenhuma URL/número publicado até serem oficiais; nada inventado.
3. **Persistência local (SQLite em arquivo)** dentro de `data/` — ideal para o estágio atual. Quando o projeto e as chaves forem provisionados, a troca para Supabase/Postgres exige apenas substituir a camada de repositório (`server/src/db.js`), sem tocar nas rotas nem no painel. Uploads migrarão para Supabase Storage com as mesmas regras de acesso.
4. **Vagas reais**: a seção Oportunidades continua com estado "Oportunidades em atualização" até a operação validar as primeiras vagas (vinculadas via `assets/js/vagas-data.js`).
5. Decisões futuras necessárias: canais oficiais (e-mail/WhatsApp), provedor de hospedagem/persistência do back-end, responsável pelo tratamento de dados (DPO/encarregado).
7. **Bloqueio técnico da publicação na Vercel:** o back-end atual (Express + SQLite em arquivo + uploads em disco) **não persiste** no runtime serverless da Vercel (filesystem efêmero e somente leitura). Para publicar de verdade em primeiropassox.vercel.app é necessário (a) migrar para Supabase Postgres + Storage (caminho já previsto — requer projeto e chaves), com o back-end publicado como funções da Vercel; ou (b) hospedar o Node/Express como está em um provedor de aplicações (Render, Railway, VPS…) e apontar o domínio; ou (c) publicar apenas o site estático na Vercel — **não recomendado**, pois o envio do cadastro e o painel deixariam de funcionar.
6. **Cookie Secure**: ao publicar em HTTPS, defina `COOKIE_SECURE=1` no ambiente para cookies marcados como `Secure`.
