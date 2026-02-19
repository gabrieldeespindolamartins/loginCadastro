# auto-context

Plugin para Claude Code que mantém contexto automático entre sessões.

## O que faz

Resolve o problema de **perder contexto** ao trocar de sessão ou quando o Claude Code compacta a conversa. O plugin cria um ciclo automático:

```
┌──────────────┐                    ┌────────────────┐
│   ENTRADA    │                    │     SAÍDA      │
│              │      lê            │                │
│  context-    │◄───────────────────│  save-progress │
│  loader      │                    │  (hook)        │
│  (subagente) │                    │                │
│  lê o        │    progress.md     │  salva no      │
│  progress.md │◄──────────────────►│  progress.md   │
└──────┬───────┘                    └───────┬────────┘
       │                                    ▲
       ▼                                    │
┌────────────────────────────────────────────┐
│          SUA SESSÃO DE TRABALHO             │
│                                            │
│   checkpoint.js ──► .auto-context-checkpoint│
│   (marcador "last alive" a cada resposta)  │
└────────────────────────────────────────────┘
```

**Na entrada:** o subagente `context-loader` lê o `progress.md` e gera um briefing rápido para o agente principal.

**Durante a sessão:** o `checkpoint.js` grava um marcador "last alive" a cada resposta do Claude, servindo como backup em caso de crash.

**Na saída:** o hook `save-progress` salva automaticamente o estado da sessão no `progress.md` — tanto quando o contexto enche (PreCompact) quanto quando você sai (SessionEnd).

## Instalação

### Opção 1: Instalação permanente (recomendada)

Descompacte o zip na raiz do seu projeto (cria a pasta `.claude-plugins/` com o marketplace + plugin):

```bash
# Windows (PowerShell)
Expand-Archive auto-context-plugin.zip -DestinationPath .claude-plugins/

# Linux/macOS
unzip auto-context-plugin.zip -d .claude-plugins/
```

Depois, dentro do Claude Code, registre o marketplace e instale o plugin (uma vez só):

```bash
/plugin marketplace add ./.claude-plugins
/plugin install auto-context@floripa-square-plugins --scope project
```

Pronto! O plugin funciona em todas as sessões futuras sem flags extras.

### Opção 2: Dev/teste (--plugin-dir)

Para testar sem instalar permanentemente:

```bash
claude --plugin-dir .claude-plugins/auto-context
```

### Opção 3: Via marketplace remoto (se publicado)

```bash
/plugin marketplace add owner/repo
/plugin install auto-context@marketplace-name
```

### Pós-instalação

As regras de contexto são adicionadas **automaticamente** ao `CLAUDE.md` do seu projeto na primeira sessão (via hook `SessionStart`). Não é necessário copiar nada manualmente.

<details>
<summary>Se preferir adicionar manualmente</summary>

Adicione ao `CLAUDE.md` do seu projeto:

```markdown
## Regras de Contexto (plugin auto-context)

### Início de sessão
Ao iniciar qualquer sessão, SEMPRE use o subagente context-loader
PRIMEIRO, antes de qualquer tarefa. Confirme o briefing com o usuário.

### Encerramento
Se o usuário disser "encerrando" ou "parando por hoje", atualize
o progress.md manualmente com o estado final e próximos passos.
```
</details>

## Uso

### Automático (não precisa fazer nada)

O plugin funciona sozinho:
- **Primeira sessão** — `setup-claude-md.js` injeta regras de contexto no `CLAUDE.md` (uma vez, idempotente)
- **Início da sessão** — `context-loader` gera briefing a partir do `progress.md`
- **A cada resposta do Claude** — `checkpoint.js` grava marcador "last alive" em `.auto-context-checkpoint`
- **Contexto enche (~95%)** — `save-progress` salva antes de compactar (trunca transcripts > 512KB)
- **Sessão encerra** — `save-progress` salva o estado final
- **Se `claude -p` falhar** — entrada de fallback com marcador "INCOMPLETO" é gravada no `progress.md`

### Comandos manuais

| Comando | O que faz |
|---------|-----------|
| `/auto-context:context` | Mostra o briefing atual do projeto |
| `/auto-context:save-progress` | Salva o estado manualmente |

### Fluxo completo

```
Você: claude
  │
  ├── Plugin carrega automaticamente
  ├── [SessionStart] setup-claude-md.js injeta regras no CLAUDE.md (se ausentes)
  ├── context-loader lê progress.md → gera briefing
  ├── Claude: "Projeto em fase X. Última sessão: Y. Próximo passo: Z."
  │
  ├── ... trabalho normal ...
  │   └── [Stop] checkpoint.js grava .auto-context-checkpoint (a cada resposta)
  │         └── Se contextThreshold configurado e % estimado atingido → dispara save-progress
  │
  ├── CENÁRIO A: Contexto enche
  │   └── PreCompact → trunca transcript se > 512KB → salva progress.md → compacta → continua
  │
  ├── CENÁRIO B: Você fecha o terminal
  │   └── SessionEnd → salva progress.md → remove .auto-context-checkpoint
  │
  ├── CENÁRIO C: Crash / queda de energia
  │   └── .auto-context-checkpoint contém o último timestamp da sessão
  │       Use `claude --continue` para retomar pelo transcript local
  │
  ├── CENÁRIO D: claude -p falha (timeout, erro)
  │   └── Entrada de fallback gravada no progress.md com marcador "INCOMPLETO"
  │
  └── Próxima sessão → context-loader lê o progress.md atualizado
```

## Estrutura do projeto

Ao descompactar o zip, a estrutura criada é:

```
.claude-plugins/
├── .claude-plugin/
│   └── marketplace.json      ← Catálogo do marketplace (floripa-square-plugins)
└── auto-context/              ← Plugin
```

### Estrutura interna do plugin

```
auto-context/
├── .claude-plugin/
│   └── plugin.json          ← Manifesto do plugin (v1.5.0)
├── agents/
│   └── context-loader.md    ← Subagente que lê o contexto
├── hooks/
│   ├── hooks.json           ← Configuração dos hooks (PreCompact, SessionEnd, Stop, SessionStart)
│   └── scripts/
│       ├── save-progress.js  ← Salva estado da sessão (Node.js, cross-platform)
│       ├── checkpoint.js     ← Marcador "last alive" (leve, sem chamar claude -p)
│       └── setup-claude-md.js ← Injeta regras no CLAUDE.md (SessionStart)
├── skills/
│   ├── auto-context/
│   │   └── SKILL.md         ← Regras de comportamento
│   ├── context/
│   │   └── SKILL.md         ← /auto-context:context
│   └── save-progress/
│       └── SKILL.md         ← /auto-context:save-progress
└── README.md                ← Este arquivo
```

## Componentes

| Componente | Tipo | Função |
|------------|------|--------|
| `context-loader` | Subagente (Haiku) | Lê progress.md e gera briefing rápido |
| `save-progress.js` | Hook script (Node.js) | Salva estado da sessão no progress.md |
| `checkpoint.js` | Hook script (Node.js) | Grava marcador "last alive" + dispara save-progress se contextThreshold atingido |
| `setup-claude-md.js` | Hook script (Node.js) | Injeta regras de contexto no CLAUDE.md do projeto |
| `hooks.json` | Configuração | Dispara scripts em PreCompact, SessionEnd, Stop e SessionStart |
| `auto-context` | Skill | Ensina o Claude o fluxo de contexto |
| `/auto-context:context` | Skill | Mostra briefing sob demanda |
| `/auto-context:save-progress` | Skill | Salva estado manualmente |

## Detalhes técnicos

### Truncamento de transcript
Transcripts maiores que 512KB são truncados automaticamente antes de enviar ao `claude -p`. O script lê apenas os últimos 512KB do arquivo, descarta a primeira linha parcial, e usa um arquivo temporário que é limpo após o uso.

**Configuração:** Edite `MAX_TRANSCRIPT_BYTES` em `save-progress.js` (padrão: `512 * 1024`).

### Checkpoint ("last alive") + contextThreshold
O script `checkpoint.js` roda no evento `Stop` (cada vez que o Claude termina uma resposta). Ele sobrescreve o arquivo `.auto-context-checkpoint` na raiz do projeto com:
```
timestamp=2026-02-16 14:30
session_id=abc-123
event=Stop
saved_at_size=450000
```
Este arquivo é removido automaticamente quando `save-progress.js` grava com sucesso no `progress.md`. Se o arquivo ainda existir ao iniciar uma nova sessão, significa que a sessão anterior não foi salva corretamente.

Se `contextThreshold` estiver configurado em `.auto-context.json`, o checkpoint.js também verifica o tamanho do transcript a cada resposta. Quando o % estimado atinge o limite, dispara o `save-progress.js` automaticamente. O campo `saved_at_size` registra o tamanho do transcript no momento do último save, evitando disparos repetidos (só salva novamente se o transcript crescer mais de 10%).

### Fallback em caso de falha
Se o `claude -p` falhar (timeout, erro de rede, etc.), o `save-progress.js` grava uma entrada mínima no `progress.md`:
```markdown
## Sessão 2026-02-16 14:30 [compact] ⚠️ INCOMPLETO
**ID:** `session-id`

> Salvamento automático falhou. Motivo: Command timed out
> Use `claude --resume` para retomar esta sessão.
```
O marcador "INCOMPLETO" permite ao `context-loader` identificar que o resumo não é confiável.

### execFile assíncrono
O `save-progress.js` usa `execFile` (não-bloqueante) ao invés de `execFileSync`, mantendo o event loop do Node.js livre durante a espera do `claude -p`. Isso permite que signal handlers e cleanup executem normalmente.

## Configuração

Crie um arquivo `.auto-context.json` na raiz do seu projeto para personalizar o comportamento do plugin:

```json
{
  "maxSessions": 10,
  "contextThreshold": 80
}
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `maxSessions` | número | `10` | Quantas sessões o context-loader carrega do progress.md |
| `contextThreshold` | número | `0` (desativado) | % estimado de contexto para disparar save-progress antecipado |

**Valores para `maxSessions`:**

| Valor | Comportamento |
|-------|---------------|
| `3` | Carrega apenas as últimas 3 sessões (~3-6 KB) |
| `5` | Carrega as últimas 5 sessões (~5-10 KB) |
| `10` | Padrão — bom equilíbrio entre contexto e performance |
| `0` | Carrega todas as sessões (sem limite) |
| Qualquer `N` | Carrega as últimas N sessões |

**Valores para `contextThreshold`:**

| Valor | Comportamento |
|-------|---------------|
| `0` | Desativado (padrão) — não dispara save-progress antecipado |
| `70` | Salva quando o contexto atinge ~70% estimado |
| `80` | Recomendado — salva antes do PreCompact (~80%) |
| `90` | Salva tardiamente (~90%) |
| `1-95` | Qualquer valor nessa faixa é aceito |

> **Nota sobre `contextThreshold`:** A estimativa do uso de contexto é baseada no **tamanho do arquivo de transcript** (~4 chars/token, janela de 200k tokens ≈ 800KB). O Claude Code **não expõe dados reais** de uso de contexto nos hooks ([#13994](https://github.com/anthropics/claude-code/issues/13994), [#6577](https://github.com/anthropics/claude-code/issues/6577), [#10593](https://github.com/anthropics/claude-code/issues/10593)). O valor real pode variar dependendo de imagens, tool calls e outros fatores. Um mecanismo anti-duplicação impede que o save-progress dispare repetidamente: só dispara novamente se o transcript crescer mais de 10% desde o último save.

Se o arquivo não existir ou for inválido, os padrões são usados automaticamente.

## Personalização

### Mudar o idioma dos resumos
Edite `hooks/scripts/save-progress.js` — altere o prompt interno (busque por "português do Brasil").

### Mudar o tamanho dos resumos
- Hook: ajuste "Máximo 300 palavras" em `save-progress.js`
- Briefing: ajuste "Máximo 150 palavras" em `agents/context-loader.md`

### Ajustar o limite de truncamento
Edite `MAX_TRANSCRIPT_BYTES` em `save-progress.js` (padrão: 512KB).

### Desativar checkpoints
Remova o bloco `"Stop"` do `hooks/hooks.json`.

### Desativar salvamento no encerramento
Remova o bloco `"SessionEnd"` do `hooks/hooks.json`.

### Desativar injeção automática de regras
Remova o bloco `"SessionStart"` do `hooks/hooks.json`.

### Desativar salvamento na compactação
Remova o bloco `"PreCompact"` do `hooks/hooks.json`.

## Casos de uso

- **Projetos individuais** — nunca mais perca onde parou
- **Trabalho colaborativo** — compartilhe o progress.md via Git
- **Sessões longas** — estado preservado mesmo após múltiplas compactações
- **Alternância entre projetos** — cada projeto tem seu próprio progress.md

## Limitações

- **Crash total** (PC desligou, queda de energia): nenhum hook dispara, mas o `.auto-context-checkpoint` contém o último timestamp. Use `claude --continue` para retomar pelo transcript local.
- **Dependência do `claude` CLI**: o script usa `claude -p` para gerar resumos. Se falhar, uma entrada de fallback é gravada.
- **Transcripts muito grandes**: limitado aos últimos 512KB. Se a informação relevante estiver no início do transcript, pode ser perdida no resumo.

## Requisitos

- Claude Code v1.0.33 ou superior (`claude --version`)
- Node.js instalado (incluído com Claude Code)
- Plano Claude Pro, Max, Team ou Enterprise

## Changelog

### v1.5.0
- Save-progress antecipado baseado em % estimado de contexto via `contextThreshold` em `.auto-context.json`
- checkpoint.js verifica tamanho do transcript a cada resposta e dispara save-progress se threshold atingido
- Mecanismo anti-duplicação: só salva novamente se transcript crescer mais de 10% desde o último save
- **Nota:** estimativa baseada no tamanho do transcript (~4 chars/token). Claude Code não expõe dados reais de contexto nos hooks

### v1.4.0
- Leitura inteligente no context-loader: carrega apenas as últimas N sessões do `progress.md`
- Configuração por projeto via `.auto-context.json` (`maxSessions`: 3, 5, 10, 0=todas, ou personalizado)
- Padrão: 10 sessões. Retrocompatível — sem config usa o padrão automaticamente

### v1.3.0
- Injeção automática de regras de contexto no `CLAUDE.md` do projeto via hook `SessionStart`
- Script `setup-claude-md.js` idempotente (usa marcador HTML para detectar injeção prévia)
- Pós-instalação manual eliminada — regras são adicionadas automaticamente na primeira sessão

### v1.2.0
- Truncamento automático de transcripts > 512KB antes de enviar ao `claude -p`
- Checkpoints intermediários via `checkpoint.js` no evento `Stop` (marcador "last alive")
- `execFile` assíncrono substitui `execFileSync` (event loop livre)
- Log de fallback no `progress.md` quando `claude -p` falha (marcador "INCOMPLETO")

### v1.1.0
- Corrigido `plugin.json` (campo `author` como objeto, `tags` → `keywords`)
- Migrado comandos para skills (formato moderno com `SKILL.md`)
- Corrigido `hooks.json` (wrapper `"hooks"` conforme especificação oficial)
- Criado marketplace local (`floripa-square-plugins`)
- Instalação permanente via `/plugin install` sem `--plugin-dir`

### v1.0.0
- Reescrita do hook de Bash para Node.js (cross-platform)
- Script `save-progress.js` com `claude -p` para geração de resumos
- Subagente `context-loader` para briefing no início da sessão
- Hooks em PreCompact e SessionEnd
