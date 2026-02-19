#!/usr/bin/env node
// ============================================================
// setup-claude-md.js — Plugin auto-context v1.3.0
//
// Injeta automaticamente as regras de contexto no CLAUDE.md
// do projeto do usuário no evento SessionStart.
//
// Idempotente: usa marcador HTML para detectar injeção prévia.
// Se as regras já existirem, não faz nada.
//
// Cross-platform: Windows, macOS, Linux
// ============================================================

const fs = require('fs');
const path = require('path');

const MARKER_START = '<!-- auto-context-rules -->';
const MARKER_END = '<!-- /auto-context-rules -->';

const RULES_BLOCK = `
${MARKER_START}
## Regras de Contexto (plugin auto-context)

### Início de sessão
Ao iniciar qualquer sessão, SEMPRE use o subagente context-loader
PRIMEIRO, antes de qualquer tarefa. Confirme o briefing com o usuário.

### Encerramento
Se o usuário disser "encerrando" ou "parando por hoje", atualize
o progress.md manualmente com o estado final e próximos passos.
${MARKER_END}
`;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
    setTimeout(() => resolve(data), 3000);
  });
}

function log(msg) {
  process.stderr.write(`[auto-context] ${msg}\n`);
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || '.';
  const claudePath = path.join(projectDir, 'CLAUDE.md');

  // --- Caso 1: CLAUDE.md não existe → cria com as regras ---
  if (!fs.existsSync(claudePath)) {
    try {
      fs.writeFileSync(claudePath, RULES_BLOCK.trimStart(), 'utf8');
      log('CLAUDE.md criado com regras de contexto');
    } catch (err) {
      log(`Erro ao criar CLAUDE.md: ${err.message}`);
    }
    process.exit(0);
  }

  // --- Caso 2: CLAUDE.md existe → verifica se regras já estão presentes ---
  let content;
  try {
    content = fs.readFileSync(claudePath, 'utf8');
  } catch (err) {
    log(`Erro ao ler CLAUDE.md: ${err.message}`);
    process.exit(0);
  }

  if (content.includes(MARKER_START)) {
    // Regras já presentes — nada a fazer (idempotente)
    process.exit(0);
  }

  // --- Caso 3: CLAUDE.md existe mas sem regras → appenda ---
  try {
    fs.appendFileSync(claudePath, RULES_BLOCK, 'utf8');
    log('Regras de contexto injetadas no CLAUDE.md');
  } catch (err) {
    log(`Erro ao atualizar CLAUDE.md: ${err.message}`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
