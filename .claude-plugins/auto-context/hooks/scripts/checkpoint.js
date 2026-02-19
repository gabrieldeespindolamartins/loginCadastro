#!/usr/bin/env node
// ============================================================
// checkpoint.js — Plugin auto-context v1.5.0
//
// Marcador leve de "last alive" que roda no evento Stop.
// Sobrescreve .auto-context-checkpoint na raiz do projeto
// com timestamp e session_id. NÃO chama claude -p diretamente.
//
// Funcionalidade adicional (v1.5.0 — contextThreshold):
// Se configurado em .auto-context.json, estima o uso de contexto
// pelo tamanho do arquivo de transcript e dispara save-progress.js
// quando o % estimado atinge o limite configurado.
//
// ⚠️ NOTA: A estimativa usa ~4 chars/token com janela de 200k
// tokens (~800KB). O Claude Code NÃO expõe dados reais de uso
// de contexto nos hooks. O valor real pode variar dependendo de
// imagens, tool calls e outros fatores.
// (Feature requests: #13994, #6577, #10593)
//
// Cross-platform: Windows, macOS, Linux
// ============================================================

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// ~200k tokens * ~4 chars/token = ~800KB
const MAX_CONTEXT_BYTES = 800 * 1024;

// Só dispara novamente se o transcript cresceu mais de 10% desde o último save
const REGROWTH_THRESHOLD = 0.10;

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

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function log(msg) {
  process.stderr.write(`[auto-context:checkpoint] ${msg}\n`);
}

function readConfig(projectDir) {
  const configPath = path.join(projectDir, '.auto-context.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch { /* ignorar */ }
  return {};
}

function readSavedAtSize(checkpointFile) {
  try {
    if (fs.existsSync(checkpointFile)) {
      const content = fs.readFileSync(checkpointFile, 'utf8');
      const match = content.match(/^saved_at_size=(\d+)$/m);
      if (match) return parseInt(match[1], 10);
    }
  } catch { /* ignorar */ }
  return 0;
}

function shouldTriggerSave(transcriptPath, contextThreshold, checkpointFile) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;

  const stats = fs.statSync(transcriptPath);
  const currentSize = stats.size;
  const estimatedPercent = (currentSize / MAX_CONTEXT_BYTES) * 100;

  if (estimatedPercent < contextThreshold) return false;

  // Anti-duplicação: só salva se cresceu mais de 10% desde o último save
  const lastSavedSize = readSavedAtSize(checkpointFile);
  if (lastSavedSize > 0) {
    const growth = (currentSize - lastSavedSize) / lastSavedSize;
    if (growth < REGROWTH_THRESHOLD) return false;
  }

  log(`Contexto estimado em ${estimatedPercent.toFixed(1)}% (threshold: ${contextThreshold}%) — disparando save-progress`);
  return true;
}

function triggerSaveProgress(input, projectDir) {
  const scriptPath = path.join(__dirname, 'save-progress.js');
  if (!fs.existsSync(scriptPath)) {
    log(`save-progress.js não encontrado: ${scriptPath}`);
    return;
  }

  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  const proc = execFile('node', [scriptPath], {
    cwd: projectDir,
    env: cleanEnv,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
  }, (err) => {
    if (err) log(`Erro ao executar save-progress: ${err.message}`);
    else log('save-progress executado com sucesso via contextThreshold');
  });

  // Envia o mesmo input que checkpoint recebeu, adicionando trigger
  const enrichedInput = { ...input, trigger: 'context-threshold' };
  proc.stdin.write(JSON.stringify(enrichedInput));
  proc.stdin.end();
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
  const checkpointFile = path.join(projectDir, '.auto-context-checkpoint');

  // --- Verificação de contextThreshold ---
  const config = readConfig(projectDir);
  const contextThreshold = config.contextThreshold || 0;

  let savedAtSize = 0;
  if (contextThreshold > 0 && contextThreshold <= 95) {
    const transcriptPath = input.transcript_path || '';
    if (shouldTriggerSave(transcriptPath, contextThreshold, checkpointFile)) {
      triggerSaveProgress(input, projectDir);
      // Registra o tamanho do transcript no momento do save
      try {
        savedAtSize = fs.statSync(transcriptPath).size;
      } catch { /* ignorar */ }
    }
  }

  // --- Checkpoint normal (sempre grava) ---
  const lines = [
    `timestamp=${formatDate(new Date())}`,
    `session_id=${input.session_id || 'unknown'}`,
    `event=${input.hook_event_name || 'Stop'}`,
  ];

  if (savedAtSize > 0) {
    lines.push(`saved_at_size=${savedAtSize}`);
  } else {
    // Preserva saved_at_size anterior se existir
    const previousSize = readSavedAtSize(checkpointFile);
    if (previousSize > 0) {
      lines.push(`saved_at_size=${previousSize}`);
    }
  }

  const content = lines.join('\n') + '\n';

  try {
    fs.writeFileSync(checkpointFile, content, 'utf8');
  } catch { /* ignorar silenciosamente */ }

  process.exit(0);
}

main().catch(() => process.exit(0));
