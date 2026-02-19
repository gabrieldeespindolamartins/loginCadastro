#!/usr/bin/env node
// ============================================================
// save-progress.js — Plugin auto-context v1.2.0
//
// Salva automaticamente o estado da sessão no progress.md
// Dispara em dois momentos:
//   - PreCompact: antes do contexto ser compactado (~95%)
//   - SessionEnd: quando a sessão encerra por qualquer motivo
//
// Melhorias v1.2.0:
//   - Trunca transcripts > 512KB (últimos 512KB)
//   - execFile async (não bloqueia event loop)
//   - Log de fallback se claude -p falhar
//   - Remove checkpoint ao gravar com sucesso
//
// Requisitos: Node.js (incluído com Claude Code), claude CLI
// Cross-platform: Windows, macOS, Linux
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const MAX_TRANSCRIPT_BYTES = 512 * 1024; // 512KB

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
    // Timeout de 5s caso stdin nunca feche
    setTimeout(() => resolve(data), 5000);
  });
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function log(msg) {
  process.stderr.write(`[auto-context] ${msg}\n`);
}

// --- Melhoria 1: Truncar transcript grande ---
function truncateTranscript(transcriptPath) {
  const stats = fs.statSync(transcriptPath);

  if (stats.size <= MAX_TRANSCRIPT_BYTES) {
    return { path: transcriptPath, truncated: false };
  }

  log(`Transcript grande (${(stats.size / 1024).toFixed(0)}KB) — truncando para últimos ${MAX_TRANSCRIPT_BYTES / 1024}KB`);

  const fd = fs.openSync(transcriptPath, 'r');
  const startPos = stats.size - MAX_TRANSCRIPT_BYTES;
  const buffer = Buffer.alloc(MAX_TRANSCRIPT_BYTES);
  fs.readSync(fd, buffer, 0, MAX_TRANSCRIPT_BYTES, startPos);
  fs.closeSync(fd);

  const content = buffer.toString('utf8');
  // Descarta a primeira linha parcial (pode estar cortada no meio)
  const firstNewline = content.indexOf('\n');
  const cleanContent = firstNewline >= 0 ? content.slice(firstNewline + 1) : content;

  const tmpPath = path.join(os.tmpdir(), 'auto-context-transcript-truncated.md');
  fs.writeFileSync(tmpPath, cleanContent, 'utf8');

  return { path: tmpPath, truncated: true };
}

function cleanupTruncated(truncatedInfo) {
  if (truncatedInfo.truncated) {
    try {
      fs.unlinkSync(truncatedInfo.path);
    } catch { /* ignorar */ }
  }
}

// --- Melhoria 3: execFile async ---
function runClaude(args, options) {
  return new Promise((resolve, reject) => {
    const proc = execFile('claude', args, options, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    // Timeout manual como backup (execFile também tem timeout nas options)
    setTimeout(() => {
      try { proc.kill(); } catch { /* ignorar */ }
    }, (options.timeout || 300000) + 5000);
  });
}

// --- Melhoria 2 (integração): Remove checkpoint após sucesso ---
function removeCheckpoint(projectDir) {
  const checkpointFile = path.join(projectDir, '.auto-context-checkpoint');
  try {
    if (fs.existsSync(checkpointFile)) {
      fs.unlinkSync(checkpointFile);
      log('Checkpoint removido');
    }
  } catch { /* ignorar */ }
}

// --- Melhoria 4: Fallback log ---
function writeFallback(progressFile, dateHeader, trigger, sessionId, errorMsg) {
  const fallback = [
    '',
    `## Sessão ${dateHeader} [${trigger}] ⚠️ INCOMPLETO`,
    `**ID:** \`${sessionId}\``,
    '',
    `> Salvamento automático falhou. Motivo: ${errorMsg}`,
    '> Use `claude --resume` para retomar esta sessão.',
    '',
    '---',
    '',
  ].join('\n');

  try {
    fs.appendFileSync(progressFile, fallback, 'utf8');
    log(`Fallback gravado no progress.md [${trigger}]`);
  } catch (writeErr) {
    log(`Falha ao gravar fallback: ${writeErr.message}`);
  }
}

async function main() {
  // --- Lê o JSON enviado via stdin pelo Claude Code ---
  const raw = await readStdin();

  if (!raw.trim()) {
    log('Nenhum input recebido via stdin');
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    log('Falha ao parsear JSON do stdin');
    process.exit(0);
  }

  // --- Extrai campos ---
  const transcriptPath = input.transcript_path || '';
  const sessionId = input.session_id || '';
  const hookEvent = input.hook_event_name || 'unknown';
  const dateHeader = formatDate(new Date());

  // --- Identifica o trigger ---
  const trigger = hookEvent === 'PreCompact'
    ? (input.trigger || 'compact')
    : 'session-end';

  // --- Validação ---
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    log(`Transcript não encontrado: ${transcriptPath}`);
    process.exit(0);
  }

  // --- Define o diretório do projeto ---
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || '.';
  const progressFile = path.join(projectDir, 'progress.md');

  // --- Cria progress.md se não existir ---
  if (!fs.existsSync(progressFile)) {
    const header = [
      '# Progress — Histórico de Sessões',
      '',
      '> Arquivo gerenciado pelo plugin **auto-context**.',
      '> Atualizado automaticamente antes de compactações e ao encerrar sessões.',
      '> Lido pelo subagente **context-loader** no início de cada sessão.',
      '',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(progressFile, header, 'utf8');
  }

  // --- Melhoria 1: Trunca o transcript se necessário ---
  let truncatedInfo;
  try {
    truncatedInfo = truncateTranscript(transcriptPath);
  } catch (err) {
    log(`Erro ao truncar transcript: ${err.message}`);
    truncatedInfo = { path: transcriptPath, truncated: false };
  }

  // --- Gera o resumo usando uma instância separada do Claude ---
  const prompt = `Leia o transcript da sessão: ${truncatedInfo.path}

Gere um resumo CONCISO em português do Brasil.
Retorne APENAS o texto do resumo, sem nenhum comentário adicional.

Use EXATAMENTE este formato:

## Sessão ${dateHeader} [${trigger}]
**ID:** \`${sessionId}\`

### Feito
- (principais ações realizadas, máx 5 itens)

### Decisões
- (decisões técnicas ou de negócio, máx 3 itens)

### Problemas
- (bugs ou dificuldades, máx 3 itens — ou 'Nenhum')

### Próximos passos
- (o que fazer a seguir, máx 3 itens)

---

REGRAS:
- Máximo 300 palavras
- Seja direto, sem introduções
- Use caminhos de arquivo quando relevante
- NÃO inclua blocos de código`;

  // Remove CLAUDECODE do env para evitar erro "nested session"
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  let summary;
  try {
    summary = await runClaude(['-p', prompt, '--output-format', 'text'], {
      timeout: 300000,
      encoding: 'utf8',
      cwd: projectDir,
      env: cleanEnv,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    log(`Erro ao chamar claude CLI: ${err.message}`);
    // --- Melhoria 4: Grava fallback ---
    writeFallback(progressFile, dateHeader, trigger, sessionId, err.message);
    cleanupTruncated(truncatedInfo);
    process.exit(0);
  }

  // --- Limpa arquivo truncado temporário ---
  cleanupTruncated(truncatedInfo);

  // --- Grava o resumo no progress.md ---
  if (summary && summary.trim()) {
    fs.appendFileSync(progressFile, '\n' + summary.trim() + '\n', 'utf8');
    log(`progress.md atualizado [${trigger}] — ${dateHeader}`);
    // --- Melhoria 2 (integração): Remove checkpoint ---
    removeCheckpoint(projectDir);
  } else {
    log('Claude não retornou resumo');
    // Grava fallback mesmo quando resumo está vazio
    writeFallback(progressFile, dateHeader, trigger, sessionId, 'Claude retornou resposta vazia');
  }
  process.exit(0);
}

main().catch((err) => {
  log(`Erro inesperado: ${err.message}`);
  process.exit(0);
});
