# Progress — SistemaLoginCadastro

## Sessão 2026-02-19 [manual]

### Feito
- Leitura e análise do `Guia.md` adicionado pelo usuário
- Definição do papel do assistente: educador de suporte, sem codar sem permissão
- Instrução adicionada ao `CLAUDE.md` com as regras de comportamento do assistente
- Configuração do atalho de troca de modo (Alt+M para ciclar entre Normal / Accept Edits / Plan Mode)
- Arquivo `auto-context-plugin.zip` identificado como dispensável (plugin já instalado)
- Criação do `progress.md` (este arquivo)

### Decisões
- Stack definida pelo guia: Next.js + FastAPI + PostgreSQL (via Docker)
- Abordagem de desenvolvimento: dados → backend → frontend (design fica para o final)
- O assistente não escreve código sem solicitação explícita do usuário
- Desenvolvimento seguirá os 29 passos do `Guia.md` em 5 fases

### Problemas
- Nenhum

### Próximos passos
- Validar pré-requisitos: `node -v`, `python --version`, `docker --version`, `git --version`
- Iniciar Fase 1 — Passo 1: criar o `docker-compose.yml` para subir o PostgreSQL

---

## Sessão 2026-02-22 [manual]

### Feito
- Validação de pré-requisitos: Node v22.13.1, Python 3.14.2, Docker 29.1.3, Git 2.50.0 — todos OK
- Explicação das extensões do VS Code (ESLint, Prettier, Python, Thunder Client)
- Passo 1 concluído: `docker-compose.yml` criado e configurado (PostgreSQL 16, porta 5432, volume persistente)
- Container `db_login_cadastro` subiu e banco respondeu via `psql`
- Criação do `Checklist.md` pelo usuário para acompanhar progresso
- Criação do `Comandos.md` pelo usuário como referência de comandos úteis

### Decisões
- Container name: `db_login_cadastro`
- Usuário do banco: `admin123`, banco: `db_login_cadastro`
- Volume nomeado: `auth_db_data`
- Campo `version` do docker-compose será removido (obsoleto nas versões recentes)

### Problemas
- Docker Desktop precisava estar aberto para o `docker-compose up -d` funcionar (resolvido)

### Próximos passos
- Remover linha `version: "3.8"` do `docker-compose.yml` (opcional, elimina warning)
- Iniciar Passo 2: criar projeto backend com FastAPI na pasta `backend/`

---

## Sessão 2026-02-22 (continuação) [manual]

### Feito
- Passo 2 concluído: projeto backend (FastAPI) inicializado
  - Pasta `backend/` criada com ambiente virtual (`venv`)
  - Dependências instaladas via pip (fastapi, uvicorn, sqlalchemy, psycopg2-binary, alembic, pydantic[email], bcrypt, pyjwt, python-dotenv)
  - `.env` criado com `DATABASE_URL` e `SECRET_KEY`
  - `.env.example` criado como modelo público (boa prática)
  - `app/__init__.py` criado (pacote Python)
  - `app/config.py` — carrega variáveis do `.env` com dotenv
  - `app/database.py` — conexão SQLAlchemy com PostgreSQL
  - `app/main.py` — rota `GET /health` retornando `{"status": "ok"}`
- Servidor FastAPI rodando com `uvicorn app.main:app --reload`
- Swagger (`localhost:8000/docs`) e rota `/health` validados com sucesso
- `.gitignore` atualizado: `.env`, `venv/`, `__pycache__/`
- VS Code configurado com interpretador do venv
- Commit e push realizados

### Decisões
- Estrutura do backend: `backend/app/` como pacote Python
- `.env.example` com valores placeholder (padrão da indústria)
- `__pycache__/` adicionado ao `.gitignore`

### Problemas
- Internet instável impediu push temporariamente (resolvido)
- VS Code não reconhecia imports — resolvido selecionando interpretador do venv e criando `__init__.py`

### Próximos passos
- Iniciar Passo 3: modelagem do banco de dados (tabela `users` + Alembic)

---

## Sessão 2026-02-22 (tarde) [manual]

### Feito
- Passo 3 concluído: modelagem do banco de dados
  - Modelo `User` criado em `app/models/user.py` (id, name, email, hashed_password, is_verified, is_active, created_at, updated_at)
  - `app/models/__init__.py` criado
  - Alembic inicializado (`alembic init alembic`)
  - `alembic/env.py` configurado para ler DATABASE_URL do config.py e enxergar os modelos
  - Migração gerada: `ed5ed3420c7b_criar_tabela_users.py`
  - Migração aplicada: tabela `users` criada no banco com todas as colunas e índices
- Driver do banco trocado de `psycopg2-binary` para `psycopg` (psycopg3) — resolve erro de encoding UTF-8 em caminhos Windows com caracteres especiais
- Porta do Docker alterada de 5432 para **5433** — conflito com PostgreSQL local instalado no Windows

### Decisões
- Driver: `psycopg` (v3) + `psycopg-binary` em vez de `psycopg2-binary`
- URL do banco usa prefixo `postgresql+psycopg://` (driver psycopg3)
- Porta do container mapeada como `5433:5432` (host:container)
- `psycopg2-binary` mantido instalado no venv (pode ser removido futuramente)

### Problemas
- **psycopg2-binary** dava `UnicodeDecodeError` por causa do caminho `Área de Trabalho` — resolvido trocando para psycopg3
- **Conflito de porta 5432**: PostgreSQL local no Windows ocupava a porta, fazendo o Python conectar no banco errado em vez do Docker — resolvido mudando para porta 5433
- Múltiplas tentativas de fix (trust auth, md5, client_encoding) falharam antes de descobrir a causa raiz

### Próximos passos
- Desinstalar `psycopg2-binary` do venv (não é mais necessário)
- Gerar `requirements.txt` com `pip freeze`
- Commit e push das mudanças do Passo 3
- Iniciar Passo 4: schemas de validação (Pydantic)

---

## Sessão 2026-02-22 16:04 [auto] ⚠️ INCOMPLETO
**ID:** `3e53e90c-d452-4a1e-973e-5920a6999a73`

> Salvamento automático falhou. Motivo: spawn claude ENOENT
> Use `claude --resume` para retomar esta sessão.

---

## Sessão 2026-03-02 [manual]

### Feito
- `psycopg2-binary` desinstalado do venv (confirmado — não aparece mais no requirements)
- `requirements.txt` regenerado em UTF-8 (corrigido encoding UTF-16 do PowerShell usando `Out-File -Encoding utf8`)
- Commit do Passo 3 realizado pelo usuário
- Explicação do Passo 4 (schemas Pydantic) — conceito de schemas de entrada/saída, validação e serialização
- Passo 4 iniciado: pasta `app/schemas/` criada com `__init__.py` e `user.py`
- Primeira versão dos schemas escrita pelo usuário (UserCreate e UserResponse)
- Revisão feita — identificados 3 ajustes necessários

### Decisões
- Para gerar `requirements.txt` no PowerShell, usar `pip freeze | Out-File -Encoding utf8 requirements.txt` (evita UTF-16)
- Schemas seguem convenção PascalCase: `UserCreate`, `UserLogin`, `UserResponse`
- `UserResponse` nunca deve expor a senha

### Problemas
- `requirements.txt` inicialmente gerado em UTF-16 pelo operador `>` do PowerShell — resolvido com `Out-File -Encoding utf8`
- Erro de digitação ao ativar venv: `.\venv\Script\activate` em vez de `.\venv\Scripts\activate` — resolvido

### Próximos passos
- Corrigir schemas: PascalCase nos nomes, remover password do UserResponse, adicionar model_config, criar UserLogin
- Após correção, validar e fazer commit do Passo 4
- Iniciar Passo 5: endpoints de cadastro e login

---

## Sessão 2026-03-05 [manual]

### Feito
- Passo 4 concluído e commitado: schemas Pydantic finalizados
  - Schemas corrigidos: PascalCase, senha removida do UserResponse, model_config adicionado, UserLogin e TokenResponse criados
  - Arquivo renomeado de `user.py` para `auth.py` (conforme guia)
  - Comentários adicionados pelo usuário e revisados
- Passo 5 iniciado: utilitários de segurança
  - Pasta `app/utils/` criada
  - `hashing.py` concluído com `hash_password` e `verify_password` (bcrypt)
  - Usuário escreveu as funções com orientação, corrigindo erros iterativamente
  - `jwt.py` em andamento — funções da biblioteca PyJWT apresentadas (`jwt.encode`, `jwt.decode`, `datetime`/`timedelta`)

### Decisões
- Schema renomeado para `auth.py` seguindo o guia
- `hashing.py` usa `hashpw`, `gensalt`, `checkpw` do bcrypt
- JWT usará algoritmo HS256, access token 15-30min, refresh token 7 dias

### Problemas
- Nenhum

### Próximos passos
- Usuário criar `utils/jwt.py` com as 3 funções (create_access_token, create_refresh_token, decode_token)
- Testar hashing e JWT manualmente no terminal Python
- Commit do Passo 5
- Iniciar Passo 6: rota de cadastro (`POST /auth/register`)

---

## Sessão 2026-03-09 [manual]

### Feito
- Revisão do contexto do Passo 5 (jwt.py) com os imports já prontos
- Explicação das 3 funções a implementar: create_access_token, create_refresh_token, decode_token
- Orientação sobre boa experiência de aprendizado: ler docs, experimentar no terminal antes de codar no projeto
- Correção de conceito: JWT não é sobre conversão binário/string, mas sobre assinatura criptográfica
- Explicação do mecanismo de assinatura: payload adulterado invalida a assinatura, acesso negado

### Decisões
- Abordagem de aprendizado: entender antes de escrever, experimentar no terminal, uma função por vez

### Problemas
- Nenhum

### Próximos passos
- Usuário verificar o que está em `settings` (config.py) necessário para JWT (SECRET_KEY e algoritmo)
- Implementar as 3 funções do jwt.py uma por vez
- Testar no terminal Python antes de integrar ao projeto
- Commit do Passo 5 após concluir jwt.py

---