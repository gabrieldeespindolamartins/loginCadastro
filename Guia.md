# Sistema de Autenticação — Guia de Desenvolvimento

## Visão geral

Este guia serve como norte para construir um sistema completo de login e cadastro usando **Next.js + FastAPI + PostgreSQL**. A abordagem segue a ordem: **dados → backend → frontend**. O design visual fica para o final — enquanto isso, todas as telas serão apenas inputs funcionais em React.

---

## Pré-requisitos antes de começar

Antes de tocar em qualquer código do projeto, garanta que essas ferramentas estão instaladas e funcionando no seu notebook:

- **Node.js** (versão LTS) e **npm** — motor do Next.js
- **Python 3.11+** e **pip** — motor do FastAPI
- **Docker Desktop** — para rodar o PostgreSQL em container
- **Git** — versionamento desde o primeiro arquivo
- **VS Code / Cursor** — seu editor, com extensões: ESLint, Prettier, Python, Thunder Client

**Validação:** cada ferramenta deve responder no terminal com `node -v`, `python --version`, `docker --version`, `git --version`.

---

## FASE 1 — Fundação

O objetivo desta fase é ter um fluxo completo de cadastro, login, proteção de rotas e logout funcionando. Tudo manual, sem bibliotecas de autenticação.

---

### Passo 1 · Infraestrutura com Docker

**O que fazer:** criar um arquivo `docker-compose.yml` na raiz do projeto que suba um container PostgreSQL.

**Ferramentas:** Docker Compose, imagem oficial `postgres`.

**Lógica:**
- Definir nome do banco, usuário e senha como variáveis de ambiente no compose.
- Mapear a porta 5432 do container para 5432 da sua máquina.
- Usar um volume nomeado para persistir os dados mesmo se o container for destruído.

**Validação:** conectar no banco usando o terminal (`psql`) ou Thunder Client do VS Code e confirmar que o banco responde.

---

### Passo 2 · Projeto Backend (FastAPI)

**O que fazer:** inicializar o projeto Python com FastAPI dentro da pasta `backend/`.

**Ferramentas:** `venv` (ambiente virtual Python), `pip`, FastAPI, Uvicorn.

**Lógica:**
- Criar ambiente virtual isolado para o projeto (`python -m venv`).
- Instalar as dependências iniciais: `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `alembic`, `pydantic[email]`, `bcrypt`, `pyjwt`, `python-dotenv`.
- Criar o arquivo `main.py` com uma rota de teste (`GET /health`) que retorna status ok.
- Criar `config.py` lendo variáveis de ambiente de um arquivo `.env` (URL do banco, secret key do JWT, etc.).
- Criar `database.py` com a conexão SQLAlchemy ao PostgreSQL.

**Validação:** rodar `uvicorn app.main:app --reload` e acessar `localhost:8000/docs` para ver a documentação automática (Swagger) com a rota de health check.

---

### Passo 3 · Modelagem do banco de dados

**O que fazer:** criar o modelo da tabela `users` e gerar a primeira migração.

**Ferramentas:** SQLAlchemy 2.0 (modelos), Alembic (migrações).

**Lógica:**
- Criar o modelo `User` em `models/user.py` com os campos:
  - `id` — identificador único (UUID ou inteiro auto-incremento)
  - `name` — nome do usuário
  - `email` — único, indexado
  - `hashed_password` — nunca armazenar a senha pura
  - `is_verified` — booleano, indica se confirmou o email (padrão: false)
  - `is_active` — booleano, permite desativar contas sem deletar
  - `created_at` — data de criação automática
  - `updated_at` — data de atualização automática
- Inicializar o Alembic (`alembic init alembic`).
- Configurar o `alembic/env.py` para apontar para seus modelos e a URL do banco.
- Gerar a primeira migração (`alembic revision --autogenerate`).
- Aplicar a migração (`alembic upgrade head`).

**Validação:** conectar no banco e verificar que a tabela `users` existe com todas as colunas.

---

### Passo 4 · Schemas de validação

**O que fazer:** criar os schemas Pydantic que definem o formato dos dados que a API recebe e retorna.

**Ferramentas:** Pydantic v2.

**Lógica:**
- Em `schemas/auth.py`, criar:
  - `UserCreate` — dados que chegam no cadastro (name, email, password). Validar: email em formato válido, senha com mínimo de caracteres.
  - `UserLogin` — dados que chegam no login (email, password).
  - `UserResponse` — dados que a API retorna sobre o usuário (id, name, email, is_verified). Nunca incluir a senha.
  - `TokenResponse` — dados que a API retorna após o login (access_token, refresh_token, token_type).

**Validação:** schemas são testados implicitamente quando as rotas forem criadas. Neste passo, garantir apenas que os arquivos importam sem erro.

---

### Passo 5 · Utilitários de segurança

**O que fazer:** criar as funções de hash de senha e geração/validação de JWT.

**Ferramentas:** bcrypt (hash), PyJWT (tokens).

**Lógica:**
- Em `utils/hashing.py`:
  - Função que recebe uma senha em texto e retorna o hash bcrypt.
  - Função que recebe uma senha em texto e um hash, e retorna verdadeiro/falso.
- Em `utils/jwt.py`:
  - Função que recebe dados do usuário (user_id, email) e retorna um access token JWT com prazo curto (15 a 30 minutos).
  - Função que recebe os mesmos dados e retorna um refresh token JWT com prazo longo (7 dias).
  - Função que recebe um token e retorna os dados decodificados, ou lança erro se expirado/inválido.
  - O JWT deve conter: `sub` (user_id), `exp` (expiração), `type` (access ou refresh).

**Validação:** testar manualmente no terminal Python — gerar um hash, verificar contra a senha original. Gerar um token, decodificar e confirmar os dados.

---

### Passo 6 · Rota de cadastro

**O que fazer:** criar o endpoint `POST /auth/register` que recebe os dados do usuário e cria a conta.

**Ferramentas:** FastAPI Router, SQLAlchemy, bcrypt.

**Lógica:**
- Em `routers/auth.py`, criar a rota que:
  1. Recebe os dados validados pelo schema `UserCreate`.
  2. Verifica se já existe um usuário com aquele email no banco.
  3. Se existir, retorna erro 409 (conflito).
  4. Se não existir, faz hash da senha com bcrypt.
  5. Cria o registro no banco com `is_verified=False`.
  6. Retorna os dados do usuário criado (sem a senha) com status 201.
- Extrair a lógica de negócio para `services/auth_service.py` — a rota só orquestra, o serviço executa.

**Validação:** usando Thunder Client ou Swagger, enviar POST com JSON válido e conferir que o usuário aparece no banco com senha hasheada.

---

### Passo 7 · Rota de login

**O que fazer:** criar o endpoint `POST /auth/login` que autentica o usuário e retorna tokens JWT.

**Ferramentas:** FastAPI Router, bcrypt, PyJWT.

**Lógica:**
- Criar a rota que:
  1. Recebe email e senha via schema `UserLogin`.
  2. Busca o usuário no banco pelo email.
  3. Se não encontrar, retorna erro 401 (credenciais inválidas). Não dizer "email não encontrado" — isso revela que o email não existe.
  4. Se encontrar, compara a senha enviada com o hash armazenado usando bcrypt.
  5. Se não bater, retorna o mesmo erro 401 genérico.
  6. Se bater, gera access token + refresh token usando as funções de `utils/jwt.py`.
  7. Retorna os tokens no schema `TokenResponse`.

**Validação:** fazer login com credenciais corretas e receber os tokens. Fazer login com credenciais erradas e receber erro 401.

---

### Passo 8 · Proteção de rotas no backend

**O que fazer:** criar um mecanismo que exige token válido para acessar rotas protegidas.

**Ferramentas:** FastAPI Depends, PyJWT.

**Lógica:**
- Criar uma dependência (function dependency do FastAPI) chamada `get_current_user` que:
  1. Extrai o token do header `Authorization: Bearer <token>`.
  2. Decodifica o token usando a função de `utils/jwt.py`.
  3. Busca o usuário no banco pelo `user_id` contido no token.
  4. Se o token for inválido, expirado, ou o usuário não existir, retorna erro 401.
  5. Se tudo estiver ok, retorna o objeto do usuário.
- Criar uma rota de teste protegida: `GET /auth/me` que retorna os dados do usuário logado.
- Qualquer rota que usar `Depends(get_current_user)` passa a exigir autenticação.

**Validação:** chamar `GET /auth/me` sem token → erro 401. Chamar com token válido → dados do usuário.

---

### Passo 9 · Rota de refresh token

**O que fazer:** criar o endpoint `POST /auth/refresh` que gera um novo access token a partir do refresh token.

**Ferramentas:** PyJWT.

**Lógica:**
- A rota recebe o refresh token no body.
- Decodifica e valida — verificando que o campo `type` é "refresh".
- Se válido, gera um novo access token e retorna.
- O refresh token em si não muda (até expirar).

**Validação:** usar um refresh token válido e receber um novo access token. Usar um access token no lugar do refresh → erro.

---

### Passo 10 · Projeto Frontend (Next.js)

**O que fazer:** inicializar o projeto Next.js dentro da pasta `frontend/` e configurar a comunicação com o backend.

**Ferramentas:** Next.js 14+ (App Router), TypeScript, Tailwind CSS.

**Lógica:**
- Criar o projeto com `npx create-next-app@latest` selecionando TypeScript, Tailwind, App Router.
- Criar `lib/api.ts` — uma função base (wrapper do `fetch`) para fazer chamadas HTTP ao FastAPI em `localhost:8000`. Centralizar aqui headers, tratamento de erros, e envio automático do token.
- Configurar o CORS no FastAPI (`fastapi.middleware.cors`) para aceitar requisições de `localhost:3000`.

**Validação:** fazer uma chamada do Next.js para `GET /health` do FastAPI e exibir a resposta na tela.

---

### Passo 11 · Telas de cadastro e login (funcionais, sem design)

**O que fazer:** criar as páginas de cadastro e login com formulários simples — apenas inputs, botão e mensagens de feedback.

**Ferramentas:** React Hook Form, Zod, `lib/api.ts`.

**Lógica:**
- Página `/cadastro`:
  - Formulário com campos: nome, email, senha, confirmar senha.
  - Validação no front com Zod (mesmo regras do backend): email válido, senha com mínimo de caracteres, senhas iguais.
  - Ao submeter, chamar `POST /auth/register` via `lib/api.ts`.
  - Exibir mensagem de sucesso ou erro vindo do backend.
- Página `/login`:
  - Formulário com campos: email, senha.
  - Ao submeter, chamar `POST /auth/login`.
  - Se sucesso, armazenar os tokens (em cookie httpOnly de preferência, ou localStorage como solução inicial mais simples).
  - Redirecionar para `/dashboard`.
- Página `/dashboard` (protegida):
  - Exibir os dados do usuário chamando `GET /auth/me` com o token.
  - Botão de logout que limpa os tokens e redireciona para `/login`.

**Validação:** fluxo completo — cadastrar um usuário, fazer login, ver dados no dashboard, fazer logout.

---

### Passo 12 · Middleware de proteção no frontend

**O que fazer:** criar o `middleware.ts` do Next.js para impedir acesso a rotas protegidas sem autenticação.

**Ferramentas:** Next.js Middleware.

**Lógica:**
- O middleware intercepta todas as requisições antes de chegar na página.
- Para rotas dentro de `(protected)/`: verificar se existe token armazenado. Se não existir, redirecionar para `/login`.
- Para rotas dentro de `(auth)/` (login, cadastro): se o usuário já tem token válido, redirecionar para `/dashboard` (não faz sentido ver tela de login estando logado).

**Validação:** tentar acessar `/dashboard` sem estar logado → redirecionado para `/login`. Acessar `/login` estando logado → redirecionado para `/dashboard`.

---

## FASE 2 — Segurança Essencial

O objetivo desta fase é adicionar verificação de email, recuperação de senha, e proteções contra ataques comuns.

---

### Passo 13 · Serviço de email

**O que fazer:** configurar o envio de emails pelo backend.

**Ferramentas:** FastAPI-Mail, um provedor SMTP (Mailtrap para desenvolvimento, Gmail ou Resend para produção).

**Lógica:**
- Em `services/email_service.py`, criar funções para:
  - Enviar email de verificação de conta (com link ou código).
  - Enviar email de recuperação de senha (com link contendo token).
- Usar templates HTML simples para os emails.
- Todas as configurações SMTP vêm do `.env`.

**Validação:** chamar a função manualmente e verificar que o email chega na caixa de entrada do Mailtrap.

---

### Passo 14 · Verificação de email no cadastro

**O que fazer:** após o cadastro, enviar email com link de verificação. O usuário não pode fazer login até confirmar.

**Ferramentas:** PyJWT (token de verificação), FastAPI-Mail.

**Lógica:**
- Alterar a rota de cadastro (`POST /auth/register`):
  - Após criar o usuário, gerar um token de verificação (JWT com prazo de 24 horas e type "verification").
  - Enviar email contendo link: `frontend.com/verificar-email?token=xxxxx`.
- Criar rota `POST /auth/verify-email`:
  - Recebe o token, decodifica, busca o usuário.
  - Se válido, atualizar `is_verified=True` no banco.
  - Se expirado ou inválido, retornar erro claro.
- Alterar a rota de login: se `is_verified=False`, retornar erro informando que precisa verificar o email.
- Criar rota `POST /auth/resend-verification`: para reenviar o email caso expire.
- No frontend, criar a página `/verificar-email` que lê o token da URL e chama a rota.

**Validação:** cadastrar → não conseguir logar → clicar no link do email → logar com sucesso.

---

### Passo 15 · Recuperação de senha

**O que fazer:** permitir que o usuário redefina a senha caso esqueça.

**Ferramentas:** PyJWT, FastAPI-Mail.

**Lógica:**
- Criar rota `POST /auth/forgot-password`:
  - Recebe o email.
  - Se o email existe no banco, gera token de reset (JWT, prazo 1 hora, type "reset", uso único).
  - Envia email com link: `frontend.com/redefinir-senha?token=xxxxx`.
  - Se o email não existe, retornar a mesma resposta de sucesso. Nunca revelar se o email está cadastrado.
- Criar rota `POST /auth/reset-password`:
  - Recebe token + nova senha.
  - Decodifica o token, busca o usuário.
  - Faz hash da nova senha e atualiza no banco.
  - Invalida o token (pode ser por campo `password_changed_at` no banco — se o token foi gerado antes dessa data, rejeitar).
- No frontend:
  - Página `/recuperar-senha` — formulário com campo de email.
  - Página `/redefinir-senha` — formulário com nova senha + confirmar senha, lê o token da URL.

**Validação:** pedir recuperação → receber email → clicar no link → redefinir a senha → logar com a nova senha. Tentar usar o mesmo link de novo → erro.

---

### Passo 16 · Rate limiting

**O que fazer:** limitar o número de requisições por IP para prevenir ataques de força bruta.

**Ferramentas:** slowapi (biblioteca para FastAPI).

**Lógica:**
- Instalar e configurar `slowapi` no `main.py`.
- Aplicar limites específicos:
  - Rota de login: máximo 5 tentativas por minuto por IP.
  - Rota de recuperação de senha: máximo 3 por minuto por IP.
  - Rota de reenviar verificação: máximo 3 por minuto por IP.
- Retornar erro 429 (Too Many Requests) quando exceder.

**Validação:** fazer 6 tentativas de login seguidas e verificar que a sexta retorna erro 429.

---

### Passo 17 · CORS e segurança de headers

**O que fazer:** configurar corretamente o CORS e adicionar headers de segurança.

**Ferramentas:** FastAPI CORSMiddleware.

**Lógica:**
- Configurar o CORS no FastAPI permitindo apenas a origem do frontend (`http://localhost:3000`).
- Definir quais métodos são permitidos (GET, POST, PUT, DELETE).
- Definir quais headers são permitidos (Authorization, Content-Type).
- Em produção, trocar para o domínio real.

**Validação:** fazer uma requisição de outro domínio (ou via curl sem origin) e confirmar que é bloqueada.

---

## FASE 3 — Experiência Moderna

O objetivo desta fase é adicionar funcionalidades que os usuários esperam de aplicações atuais: login social, 2FA, e gestão de sessões.

---

### Passo 18 · Login com Google (OAuth 2.0)

**O que fazer:** permitir que o usuário faça login ou cadastro usando a conta Google.

**Ferramentas:** Authlib (biblioteca Python para OAuth), Google Cloud Console (para criar credenciais).

**Lógica:**
- No Google Cloud Console:
  - Criar um projeto.
  - Ativar a API de OAuth.
  - Criar credenciais OAuth 2.0 (client_id e client_secret).
  - Configurar URLs de redirecionamento.
- No backend:
  - Rota `GET /auth/google/login` — redireciona o usuário para a tela de consentimento do Google.
  - Rota `GET /auth/google/callback` — recebe o código de autorização que o Google retorna.
  - Com o código, troca por um access token do Google usando Authlib.
  - Com o access token, busca os dados do usuário (nome, email, foto).
  - Se o email já existe no banco, faz login (gera JWT).
  - Se não existe, cria a conta automaticamente (já verificada, pois o Google garante o email) e faz login.
- No frontend:
  - Botão "Entrar com Google" nas páginas de login e cadastro.
  - O botão redireciona para a rota do backend que inicia o fluxo OAuth.

**Validação:** clicar em "Entrar com Google" → ser redirecionado para o Google → autorizar → voltar para o dashboard logado.

---

### Passo 19 · Verificação em duas etapas (2FA) por email

**O que fazer:** adicionar uma camada extra de segurança após o login com senha.

**Ferramentas:** PyJWT, FastAPI-Mail, `secrets` (biblioteca padrão do Python).

**Lógica:**
- Adicionar campo `is_2fa_enabled` na tabela `users` (padrão: false).
- Criar tela de configuração no dashboard onde o usuário ativa/desativa 2FA.
- Alterar o fluxo de login:
  - Se 2FA está desativado: comportamento normal, retorna tokens.
  - Se 2FA está ativado:
    1. Após validar email+senha, não retorna tokens ainda.
    2. Gera código de 6 dígitos aleatório usando `secrets.randbelow`.
    3. Salva o código no banco ou em cache (com expiração de 5 minutos).
    4. Envia o código por email.
    5. Retorna resposta indicando que 2FA é necessário.
- Criar rota `POST /auth/verify-2fa`:
  - Recebe o código + identificador temporário do login pendente.
  - Valida o código.
  - Se correto, retorna os tokens JWT normais.
  - Se errado ou expirado, retorna erro.
- No frontend:
  - Após o login retornar que precisa de 2FA, exibir tela de input para o código.

**Validação:** ativar 2FA → fazer login → receber código no email → digitar código → acessar dashboard.

---

### Passo 20 · Refresh token automático no frontend

**O que fazer:** renovar o access token automaticamente quando ele expira, sem que o usuário perceba.

**Ferramentas:** `lib/api.ts` (wrapper do fetch).

**Lógica:**
- Alterar o wrapper de fetch em `lib/api.ts`:
  - Ao receber erro 401 em qualquer requisição:
    1. Verificar se tem refresh token armazenado.
    2. Chamar `POST /auth/refresh` para obter novo access token.
    3. Se o refresh tiver sucesso, repetir a requisição original com o novo token.
    4. Se o refresh falhar (token expirado), redirecionar para `/login`.
- Esse mecanismo é chamado de **interceptor** — funciona de forma transparente para o resto do app.

**Validação:** fazer login, esperar o access token expirar (ou reduzir o tempo pra teste), fazer uma requisição — deve funcionar sem pedir login de novo.

---

### Passo 21 · Gerenciamento de sessões

**O que fazer:** permitir que o usuário veja onde está logado e encerre sessões remotamente.

**Ferramentas:** SQLAlchemy (nova tabela), user-agent parser.

**Lógica:**
- Criar tabela `sessions` no banco com: id, user_id, refresh_token_hash, device_info (browser, OS), ip_address, created_at, last_used_at, is_active.
- Alterar o login: ao gerar refresh token, criar registro na tabela `sessions`.
- Alterar o refresh: atualizar `last_used_at` na sessão correspondente.
- Criar rota `GET /auth/sessions` — retorna todas as sessões ativas do usuário.
- Criar rota `DELETE /auth/sessions/{session_id}` — desativa uma sessão (marca como inativa, invalida o refresh token correspondente).
- No frontend:
  - Tela no dashboard listando as sessões com dispositivo, IP e última atividade.
  - Botão "Encerrar" ao lado de cada sessão.
  - Destaque visual para "esta sessão" (a atual).

**Validação:** logar de dois navegadores diferentes → ver duas sessões na lista → encerrar uma → confirmar que aquele navegador é deslogado.

---

## FASE 4 — Nível Profissional

O objetivo desta fase é adicionar funcionalidades avançadas que completam o sistema como produto de qualidade.

---

### Passo 22 · 2FA com app autenticador (TOTP)

**O que fazer:** adicionar suporte a Google Authenticator ou Authy.

**Ferramentas:** `pyotp` (biblioteca Python para TOTP), `qrcode` (gerar QR code).

**Lógica:**
- Quando o usuário ativar 2FA por app:
  - Gerar uma chave secreta TOTP com `pyotp` e armazenar (criptografada) no banco.
  - Gerar um QR code a partir dessa chave.
  - Exibir o QR code no frontend para o usuário escanear com o app.
  - Pedir que o usuário digite o código gerado pelo app para confirmar a configuração.
  - Gerar códigos de recuperação (8-10 códigos de uso único) e armazenar hasheados no banco. Exibir uma vez para o usuário anotar.
- No login com 2FA-TOTP:
  - Após validar email+senha, pedir o código de 6 dígitos.
  - Validar usando `pyotp.totp.verify()` (aceita uma janela de tolerância de ±30 segundos).
  - Se o código for de recuperação (não TOTP), validar contra os códigos armazenados e marcar como usado.

**Validação:** ativar TOTP → escanear QR → login pedindo código do app → código correto acessa → código errado rejeita.

---

### Passo 23 · Magic link (login sem senha)

**O que fazer:** permitir login apenas com email, sem digitar senha.

**Ferramentas:** PyJWT, FastAPI-Mail.

**Lógica:**
- Criar rota `POST /auth/magic-link`:
  - Recebe o email.
  - Gera token JWT de uso único (prazo de 15 minutos, type "magic").
  - Envia email com link: `frontend.com/magic-login?token=xxxxx`.
  - Resposta sempre genérica (não revelar se email existe).
- Criar rota `POST /auth/magic-login`:
  - Recebe o token da URL.
  - Decodifica, busca o usuário, valida uso único.
  - Se válido, gera access + refresh tokens normalmente.
- No frontend:
  - Na tela de login, link "Entrar sem senha".
  - Formulário com apenas o campo de email.
  - Após enviar, exibir mensagem "Verifique seu email".
  - Página `/magic-login` que lê o token da URL e completa o login.

**Validação:** pedir magic link → receber email → clicar → estar logado no dashboard.

---

### Passo 24 · Auditoria de logins

**O que fazer:** registrar todas as tentativas de acesso para segurança e transparência.

**Ferramentas:** SQLAlchemy (nova tabela).

**Lógica:**
- Criar tabela `login_audit` com: id, user_id (nullable, pois tentativas falhas podem não ter usuário), email_attempted, ip_address, user_agent, action (login_success, login_failed, password_reset, 2fa_failed, account_locked), timestamp.
- Inserir registro em cada evento relevante:
  - Login com sucesso
  - Login com senha errada
  - Login com 2FA errado
  - Recuperação de senha solicitada
  - Conta bloqueada
- Criar rota `GET /auth/audit` — retorna o histórico de ações do usuário logado (paginado).
- No frontend:
  - Tela no dashboard mostrando o histórico de atividades.
  - Destaque visual para ações suspeitas (falhas, IPs desconhecidos).

**Validação:** fazer login de IPs diferentes, errar senha propositalmente, e confirmar que tudo aparece no histórico.

---

### Passo 25 · Bloqueio de conta

**O que fazer:** bloquear temporariamente contas com muitas tentativas de login falhadas.

**Ferramentas:** SQLAlchemy (campos na tabela users ou tabela separada).

**Lógica:**
- Adicionar campos na tabela `users`: `failed_login_attempts` (contador), `locked_until` (datetime nullable).
- Alterar a rota de login:
  - Antes de validar senha, verificar se `locked_until` é futuro. Se sim, retornar erro informando que a conta está bloqueada e até quando.
  - A cada login falhado, incrementar `failed_login_attempts`.
  - Ao atingir o limite (por exemplo, 10 tentativas), definir `locked_until` como agora + 30 minutos. Enviar email avisando o usuário.
  - A cada login com sucesso, zerar o contador.
- A conta desbloqueia automaticamente quando `locked_until` passa. O usuário também pode desbloquear via recuperação de senha.

**Validação:** errar a senha 10 vezes → conta bloqueada → tentar novamente → erro com tempo restante → esperar (ou reduzir pra teste) → conta desbloqueada.

---

## FASE 5 — Design e Polimento

O objetivo desta fase é transformar as telas funcionais em uma interface profissional, agora que todas as funcionalidades estão prontas e testadas.

---

### Passo 26 · Design system básico

**O que fazer:** definir os padrões visuais que serão usados em todas as telas.

**Ferramentas:** Tailwind CSS.

**Lógica:**
- Definir paleta de cores no `tailwind.config.ts` (primária, secundária, erro, sucesso, neutras).
- Definir tipografia (fonte, tamanhos para títulos, corpo, labels).
- Criar componentes base reutilizáveis: Input, Button, Card, Alert, Loading.
- Cada componente aceita variantes (ex: Button primary, secondary, danger).

---

### Passo 27 · Layout das páginas de autenticação

**O que fazer:** criar o layout visual das telas de login, cadastro, recuperação de senha e verificação.

**Ferramentas:** Tailwind CSS, componentes do passo anterior.

**Lógica:**
- Layout centralizado (formulário no meio da tela), responsivo.
- Logo ou nome do sistema no topo.
- Links de navegação entre as telas (ex: "Não tem conta? Cadastre-se").
- Feedback visual claro: loading no botão durante requisição, mensagens de erro inline nos campos, mensagem de sucesso global.
- Transições suaves entre estados (carregando, erro, sucesso).

---

### Passo 28 · Layout do dashboard

**O que fazer:** criar a área logada com navegação e as telas internas (perfil, sessões, auditoria, configurações de 2FA).

**Ferramentas:** Tailwind CSS, componentes reutilizáveis.

**Lógica:**
- Sidebar ou navbar com menu de navegação.
- Páginas internas: Perfil, Sessões ativas, Histórico de atividades, Configurações de segurança (2FA).
- Responsivo: funcionar em tela grande e mobile.
- Estado de loading e empty states (quando não há dados para exibir).

---

### Passo 29 · Testes finais e revisão

**O que fazer:** testar todos os fluxos ponta a ponta e corrigir problemas.

**Lógica:**
- Testar cada fluxo completo como um usuário faria:
  - Cadastro completo (com verificação de email).
  - Login com senha, com Google, com magic link.
  - 2FA por email e por app.
  - Recuperação de senha.
  - Gerenciamento de sessões.
  - Auditoria.
  - Bloqueio de conta.
  - Refresh token automático.
- Testar cenários de erro: senha errada, token expirado, email inválido, conta bloqueada.
- Testar em navegadores diferentes.
- Verificar responsividade no mobile.

---

## Checklist geral do projeto

### Pré-requisitos
- [ ] Node.js instalado e funcionando
- [ ] Python 3.11+ instalado e funcionando
- [ ] Docker Desktop instalado e funcionando
- [ ] Git instalado e funcionando
- [ ] Editor (Cursor/VS Code) configurado com extensões

### Fase 1 — Fundação
- [ ] Docker Compose rodando PostgreSQL
- [ ] Projeto FastAPI inicializado e respondendo em /docs
- [ ] Modelo User criado com SQLAlchemy
- [ ] Primeira migração aplicada com Alembic
- [ ] Schemas Pydantic definidos (UserCreate, UserLogin, UserResponse, TokenResponse)
- [ ] Funções de hash com bcrypt funcionando
- [ ] Funções de JWT com PyJWT funcionando
- [ ] Rota POST /auth/register criando usuário com senha hasheada
- [ ] Rota POST /auth/login retornando access + refresh tokens
- [ ] Dependência get_current_user protegendo rotas
- [ ] Rota GET /auth/me retornando dados do usuário logado
- [ ] Rota POST /auth/refresh renovando access token
- [ ] Projeto Next.js inicializado com TypeScript e Tailwind
- [ ] Wrapper de fetch (lib/api.ts) comunicando com FastAPI
- [ ] CORS configurado no FastAPI
- [ ] Tela de cadastro funcional (inputs + submit)
- [ ] Tela de login funcional (inputs + submit)
- [ ] Tela de dashboard exibindo dados do usuário
- [ ] Logout funcionando
- [ ] Middleware do Next.js protegendo rotas

### Fase 2 — Segurança Essencial
- [ ] Serviço de email configurado e enviando
- [ ] Verificação de email no cadastro funcionando
- [ ] Reenvio de email de verificação funcionando
- [ ] Login bloqueado para contas não verificadas
- [ ] Recuperação de senha (solicitar) funcionando
- [ ] Redefinição de senha (link + formulário) funcionando
- [ ] Token de reset de uso único (não reutilizável)
- [ ] Rate limiting aplicado nas rotas sensíveis
- [ ] CORS restrito ao domínio do frontend

### Fase 3 — Experiência Moderna
- [ ] Credenciais OAuth criadas no Google Cloud Console
- [ ] Login com Google funcionando (cadastro automático + login)
- [ ] 2FA por email — ativação/desativação no dashboard
- [ ] 2FA por email — fluxo de login com código
- [ ] Refresh token automático no frontend (interceptor)
- [ ] Tabela sessions criada
- [ ] Tela de sessões ativas no dashboard
- [ ] Encerramento remoto de sessões funcionando

### Fase 4 — Nível Profissional
- [ ] 2FA com TOTP — geração de QR code
- [ ] 2FA com TOTP — validação de código no login
- [ ] Códigos de recuperação gerados e funcionando
- [ ] Magic link — envio de email
- [ ] Magic link — login via link funcionando
- [ ] Tabela login_audit criada
- [ ] Registro de eventos de auditoria
- [ ] Tela de histórico de atividades no dashboard
- [ ] Bloqueio de conta após tentativas falhas
- [ ] Desbloqueio automático por tempo
- [ ] Desbloqueio via recuperação de senha
- [ ] Email de alerta ao bloquear conta

### Fase 5 — Design e Polimento
- [ ] Paleta de cores e tipografia definidas no Tailwind
- [ ] Componentes base criados (Input, Button, Card, Alert, Loading)
- [ ] Telas de autenticação com layout profissional
- [ ] Dashboard com navegação e layout responsivo
- [ ] Feedback visual em todos os formulários (loading, erro, sucesso)
- [ ] Testes de todos os fluxos ponta a ponta
- [ ] Testes de cenários de erro
- [ ] Responsividade verificada em mobile
