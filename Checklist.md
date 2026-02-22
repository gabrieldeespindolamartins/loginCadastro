## Checklist geral do projeto

### Pré-requisitos
- [X] Node.js instalado e funcionando
- [X] Python 3.11+ instalado e funcionando
- [X] Docker Desktop instalado e funcionando
- [X] Git instalado e funcionando
- [X] Editor (Cursor/VS Code) configurado com extensões

### Fase 1 — Fundação
- [X] Docker Compose rodando PostgreSQL
- [X] Projeto FastAPI inicializado e respondendo em /docs
- [X] Modelo User criado com SQLAlchemy
- [X] Primeira migração aplicada com Alembic
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
