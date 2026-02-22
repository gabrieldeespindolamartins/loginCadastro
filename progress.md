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
