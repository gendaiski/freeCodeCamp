/**
 * Code execution behind one interface.
 *  - Judge0Executor: production. Sandboxed, isolated network plane, per-submission limits.
 *  - LocalExecutor: development/tests only (config forbids it in production). Runs whatever
 *    toolchains exist on the host with a wall-clock timeout; NOT a security boundary.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type IdeLanguage, type SubmissionStatus, mapJudge0Status } from '@lawmads/shared';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';

export interface ExecRequest { language: IdeLanguage; code: string; stdin: string; timeLimitSec?: number | null; memoryKb?: number | null }
export interface ExecResult { status: SubmissionStatus; stdout: string; stderr: string; compileOutput: string; timeMs: number | null; memoryKb: number | null; message?: string }
export interface AsyncSubmit { token: string }

export interface Executor {
  readonly name: 'local' | 'judge0';
  supports(lang: IdeLanguage): boolean;
  /** Synchronous run (used by Run and by the local grading path). */
  run(req: ExecRequest): Promise<ExecResult>;
  /** Asynchronous submit with a callback URL (Judge0 only). */
  submitAsync?(req: ExecRequest, callbackUrl: string): Promise<AsyncSubmit>;
  /** Poll a token (Judge0 reconciliation). */
  fetch?(token: string): Promise<ExecResult | null>;
}

const here = dirname(fileURLToPath(import.meta.url));
const SQL_RUNNER = join(here, 'sqlrunner.py');

async function has(bin: string): Promise<boolean> {
  const paths = (process.env.PATH ?? '').split(':');
  for (const p of paths) { try { await access(join(p, bin)); return true; } catch { /* next */ } }
  return false;
}

interface Spawned { code: number | null; stdout: string; stderr: string; timedOut: boolean; ms: number }
function run(cmd: string, args: string[], opts: { cwd: string; stdin?: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<Spawned> {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const cap = (s: string, chunk: Buffer) => (s.length > 64_000 ? s : s + chunk.toString('utf8'));
    child.stdout.on('data', (d) => { stdout = cap(stdout, d); });
    child.stderr.on('data', (d) => { stderr = cap(stderr, d); });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, opts.timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: stderr + String(e), timedOut, ms: Date.now() - start }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut, ms: Date.now() - start }); });
    if (opts.stdin !== undefined) child.stdin.write(opts.stdin);
    child.stdin.end();
  });
}

type Recipe = { file: string; compile?: string[][]; exec: string[]; bin: string; env?: NodeJS.ProcessEnv };
const RECIPES: Record<string, Recipe> = {
  javascript: { file: 'main.js', exec: ['node', 'main.js'], bin: 'node' },
  typescript: { file: 'main.ts', exec: ['node', '--no-warnings', '--experimental-strip-types', 'main.ts'], bin: 'node' },
  python: { file: 'main.py', exec: ['python3', 'main.py'], bin: 'python3' },
  sql: { file: 'query.sql', exec: ['python3', SQL_RUNNER, 'query.sql'], bin: 'python3' },
  java: { file: 'Main.java', compile: [['javac', 'Main.java']], exec: ['java', '-cp', '.', 'Main'], bin: 'javac' },
  c: { file: 'main.c', compile: [['gcc', '-O2', '-o', 'app', 'main.c']], exec: ['./app'], bin: 'gcc' },
  cpp: { file: 'main.cpp', compile: [['g++', '-O2', '-std=c++17', '-o', 'app', 'main.cpp']], exec: ['./app'], bin: 'g++' },
  go: { file: 'main.go', compile: [['go', 'build', '-o', 'app', 'main.go']], exec: ['./app'], bin: 'go', env: { GO111MODULE: 'off', GOCACHE: join(tmpdir(), 'lawmads-gocache'), GOPATH: join(tmpdir(), 'lawmads-gopath'), HOME: tmpdir() } },
  php: { file: 'main.php', exec: ['php', 'main.php'], bin: 'php' },
  ruby: { file: 'main.rb', exec: ['ruby', 'main.rb'], bin: 'ruby' },
  rust: { file: 'main.rs', compile: [['rustc', '-O', '-o', 'app', 'main.rs']], exec: ['./app'], bin: 'rustc' },
  r: { file: 'main.R', exec: ['Rscript', 'main.R'], bin: 'Rscript' },
  dart: { file: 'main.dart', exec: ['dart', 'run', 'main.dart'], bin: 'dart' },
  kotlin: { file: 'Main.kt', compile: [['kotlinc', 'Main.kt', '-include-runtime', '-d', 'app.jar']], exec: ['java', '-jar', 'app.jar'], bin: 'kotlinc' },
  swift: { file: 'main.swift', compile: [['swiftc', '-O', '-o', 'app', 'main.swift']], exec: ['./app'], bin: 'swiftc' },
  csharp: { file: 'Program.cs', compile: [['mcs', '-out:app.exe', 'Program.cs']], exec: ['mono', 'app.exe'], bin: 'mcs' }
};

export class LocalExecutor implements Executor {
  readonly name = 'local' as const;
  private cache = new Map<string, boolean>();
  supports(lang: IdeLanguage): boolean { return lang.grading === 'stdio' && Boolean(RECIPES[lang.slug]); }
  async available(lang: IdeLanguage): Promise<boolean> {
    const r = RECIPES[lang.slug];
    if (!r) return false;
    if (!this.cache.has(r.bin)) this.cache.set(r.bin, await has(r.bin));
    return this.cache.get(r.bin)!;
  }
  async run(req: ExecRequest): Promise<ExecResult> {
    const recipe = RECIPES[req.language.slug];
    if (!recipe || !(await this.available(req.language))) {
      return { status: 'error', stdout: '', stderr: '', compileOutput: '', timeMs: null, memoryKb: null, message: `${req.language.name} runtime is not available on this host (production uses Judge0)` };
    }
    const dir = await mkdtemp(join(tmpdir(), 'lawmads-run-'));
    try {
      await writeFile(join(dir, recipe.file), req.code, 'utf8');
      const timeoutMs = Math.max(1000, Math.round((req.timeLimitSec ?? 5) * 1000) + 5000);
      for (const step of recipe.compile ?? []) {
        const c = await run(step[0]!, step.slice(1), { cwd: dir, timeoutMs: 60_000, env: recipe.env });
        if (c.code !== 0) return { status: 'compile_error', stdout: '', stderr: '', compileOutput: (c.stderr || c.stdout).slice(0, 8000), timeMs: null, memoryKb: null };
      }
      const r = await run(recipe.exec[0]!, recipe.exec.slice(1), { cwd: dir, stdin: req.stdin, timeoutMs, env: recipe.env });
      if (r.timedOut) return { status: 'time_limit', stdout: r.stdout, stderr: r.stderr, compileOutput: '', timeMs: r.ms, memoryKb: null };
      if (r.code !== 0) return { status: 'runtime_error', stdout: r.stdout, stderr: r.stderr.slice(0, 8000), compileOutput: '', timeMs: r.ms, memoryKb: null };
      return { status: 'graded', stdout: r.stdout, stderr: r.stderr.slice(0, 8000), compileOutput: '', timeMs: r.ms, memoryKb: null };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');

export class Judge0Executor implements Executor {
  readonly name = 'judge0' as const;
  constructor(private base = config.judge0.url, private token = config.judge0.authToken) {}
  supports(lang: IdeLanguage): boolean { return lang.grading === 'stdio' && lang.judge0Id !== null; }
  private headers() { return { 'content-type': 'application/json', ...(this.token ? { 'X-Auth-Token': this.token } : {}) }; }
  private body(req: ExecRequest, extra: Record<string, unknown> = {}) {
    return JSON.stringify({ language_id: req.language.judge0Id, source_code: b64(req.code), stdin: b64(req.stdin), cpu_time_limit: req.timeLimitSec ?? undefined, memory_limit: req.memoryKb ?? undefined, ...extra });
  }
  static toResult(j: any): ExecResult {
    const id = Number(j?.status?.id ?? 13);
    return { status: mapJudge0Status(id), stdout: unb64(j.stdout), stderr: unb64(j.stderr), compileOutput: unb64(j.compile_output), timeMs: j.time ? Math.round(Number(j.time) * 1000) : null, memoryKb: j.memory ? Number(j.memory) : null, message: unb64(j.message) || j?.status?.description };
  }
  async run(req: ExecRequest): Promise<ExecResult> {
    const res = await fetch(`${this.base}/submissions?base64_encoded=true&wait=true`, { method: 'POST', headers: this.headers(), body: this.body(req) });
    if (!res.ok) throw new Error(`judge0 ${res.status}`);
    return Judge0Executor.toResult(await res.json());
  }
  async submitAsync(req: ExecRequest, callbackUrl: string): Promise<AsyncSubmit> {
    const res = await fetch(`${this.base}/submissions?base64_encoded=true&wait=false`, { method: 'POST', headers: this.headers(), body: this.body(req, { callback_url: callbackUrl }) });
    if (!res.ok) throw new Error(`judge0 ${res.status}`);
    const j = (await res.json()) as { token: string };
    return { token: j.token };
  }
  async fetch(token: string): Promise<ExecResult | null> {
    const res = await fetch(`${this.base}/submissions/${token}?base64_encoded=true`, { headers: this.headers() });
    if (!res.ok) return null;
    const j: any = await res.json();
    const id = Number(j?.status?.id ?? 1);
    if (id <= 2) return null; // still queued/processing
    return Judge0Executor.toResult(j);
  }
}

let executor: Executor | null = null;
export function getExecutor(): Executor {
  if (!executor) {
    executor = config.executor === 'judge0' ? new Judge0Executor() : new LocalExecutor();
    logger.info({ executor: executor.name }, 'executor selected');
  }
  return executor;
}
export function setExecutor(e: Executor | null) { executor = e; }
