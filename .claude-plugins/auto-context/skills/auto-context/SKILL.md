---
name: auto-context
description: "Session context management workflow. Ensures context-loader runs at session start, and progress.md is maintained throughout the session. Use when starting sessions, planning work, or when context seems missing."
---

# Auto-Context: Gestão de Contexto entre Sessões

## Início de Sessão

Ao iniciar qualquer sessão ou receber a primeira tarefa:

1. **SEMPRE** use o subagente `context-loader` PRIMEIRO
2. Leia o briefing retornado
3. Confirme com o usuário se o contexto está correto
4. Só então prossiga com a tarefa solicitada

Se o context-loader reportar "Primeira sessão", pergunte ao
usuário qual é o foco do trabalho de hoje.

## Durante a Sessão

- O plugin salva automaticamente o estado no `progress.md`
  antes de compactações e ao encerrar a sessão
- A cada resposta, `checkpoint.js` grava um marcador "last alive"
- Se `contextThreshold` estiver configurado em `.auto-context.json`,
  o checkpoint também estima o uso de contexto pelo tamanho do
  transcript e dispara `save-progress` antecipadamente ao atingir o limite
- Você não precisa fazer nada manualmente na maioria dos casos

## Encerramento Manual

Se o usuário disser "encerrando", "parando por hoje", ou similar:

1. Atualize `progress.md` manualmente com o estado final
2. Liste explicitamente os próximos passos
3. Confirme que o arquivo foi atualizado

## Referência

- Estado do projeto: `progress.md` (raiz do projeto)
- Subagente de contexto: `context-loader`
- Hooks ativos: `SessionStart` + `Stop` (checkpoint + contextThreshold) + `PreCompact` + `SessionEnd`
- Configuração: `.auto-context.json` (`maxSessions`, `contextThreshold`)
